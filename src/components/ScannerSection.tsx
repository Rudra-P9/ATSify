import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    FileText,
    Upload,
    Search,
    CheckCircle2,
    AlertCircle,
    Clock,
    Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { parseDocument } from '../lib/parser';
import { analyzeResume, ResumeMetadata, ATSResult } from '../lib/gemini';

export interface ScannerSectionProps {
    onResults: (results: ATSResult[], resume: string, jd: string, metadata: ResumeMetadata) => void;
}

export default function ScannerSection({ onResults }: ScannerSectionProps) {
    const [file, setFile] = useState<File | null>(null);
    const [jobDescription, setJobDescription] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [completedPlatforms, setCompletedPlatforms] = useState<string[]>([]);
    const [error, setError] = useState('');

    const PLATFORMS = ['WORKDAY', 'TALEO', 'ICIMS', 'GREENHOUSE', 'LEVER', 'S.FACTORS'];

    const handleScan = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }
        setError('');
        setIsScanning(true);
        setProgress(0);
        setCompletedPlatforms([]);

        // Dynamic progress approach
        let startTime = Date.now();
        const duration = 8000; // Expected duration of ~8 seconds for heavy lifting

        const updateProgress = () => {
            if (!isScanning) return;

            const elapsed = Date.now() - startTime;
            const rawProgress = Math.min(98, (elapsed / duration) * 100);

            // Add some "jitter" to make it feel real
            const jitter = Math.sin(elapsed / 500) * 2;
            const smoothProgress = Math.max(0, rawProgress + jitter);

            setProgress(smoothProgress);

            // Update completed platforms based on progress
            const completedCount = Math.floor((smoothProgress / 100) * PLATFORMS.length);
            if (completedCount > completedPlatforms.length) {
                setCompletedPlatforms(PLATFORMS.slice(0, completedCount));
            }

            if (smoothProgress < 98) {
                requestAnimationFrame(updateProgress);
            }
        };

        requestAnimationFrame(updateProgress);

        try {
            // Step 1: Parsing
            const doc = await parseDocument(file);
            const text = doc.rawText;

            console.log("[ATSify-UI] Initiating analysis for:", file.name);
            const response = await analyzeResume(doc, jobDescription);
            console.log("[ATSify-UI] Analysis completed. Engine used:", response.results[0]?.engineUsed);

            // Step 3: Complete - Smoothly transition to 100%
            setProgress(100);
            setCompletedPlatforms(PLATFORMS);

            setTimeout(() => {
                onResults(response.results, text, jobDescription, response.metadata);
            }, 1000);
        } catch (err: any) {
            setError(err.message || "Engine error. Please try again.");
            setIsScanning(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-12 animate-fade-in" id="scanner-section" >
            <div className="space-y-4" >
                <div className="inline-flex px-3 py-1 bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[#6366f1]/20" >
                    Document Intelligence Engine
                </div>
                < h2 className="text-5xl font-black text-white tracking-tighter" >
                    Scan Your Resume Against < br />
                    <span className="text-[#6366f1]" > Real ATS Systems </span>
                </h2>
                < p className="text-white/30 text-lg font-medium" >
                    Upload your resume and optionally paste a job description.Files are parsed client - side.
                </p>
            </div>

            {
                isScanning ? (
                    <div className="glass p-16 rounded-[2.5rem] flex flex-col items-center justify-center space-y-10 border-[#6366f1]/20 shadow-2xl shadow-[#6366f1]/5 relative overflow-hidden" >
                        <div
                            className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#10b981] to-[#10b981] transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }
                            }
                        />
                        < div className="relative" >
                            <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center" >
                                <FileText className="w-10 h-10 text-[#6366f1] animate-pulse" />
                            </div>
                            < div className="absolute -inset-2 border border-[#6366f1]/20 rounded-full animate-spin-slow" />
                        </div>
                        < div className="text-center space-y-3" >
                            <h3 className="text-2xl font-black text-white" > Analyzing across 6 ATS platforms </h3>
                            < p className="text-[#6366f1] font-bold text-sm tracking-widest uppercase" >
                                {progress < 25 ? 'Extracting Text...' : progress < 70 ? 'Analyzing keywords...' : 'Simulating platform logic...'}
                            </p>
                        </div>
                        < div className="flex flex-wrap justify-center gap-3" >
                            {
                                PLATFORMS.map((platform) => {
                                    const isCompleted = completedPlatforms.includes(platform) || progress === 100;
                                    return (
                                        <div
                                            key={platform}
                                            className={
                                                cn(
                                                    "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest border transition-all duration-700",
                                                    isCompleted
                                                        ? "bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                        : "bg-white/5 border-white/5 text-white/20"
                                                )
                                            }
                                        >
                                            <span className="flex items-center gap-1.5" >
                                                {isCompleted && <Check className="w-3 h-3" />}
                                                {platform}
                                            </span>
                                        </div>
                                    );
                                })
                            }
                        </div>
                        < div className="text-white/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" >
                            <Clock className="w-3 h-3" /> Real - time simulation active
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-8" >
                        <div
                            className={
                                cn(
                                    "p-12 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-6 transition-all group relative overflow-hidden cursor-pointer",
                                    file ? "bg-[#6366f1]/5 border-[#6366f1]/40" : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                                )
                            }
                            onClick={() => document.getElementById('resume-upload')?.click()}
                        >
                            <input
                                type="file"
                                id="resume-upload"
                                className="hidden"
                                accept=".pdf,.docx"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            {
                                file ? (
                                    <div className="flex items-center gap-4 p-6 bg-white/[0.05] rounded-3xl border border-[#10b981]/20" >
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shadow-lg" >
                                            <FileText className="w-6 h-6 text-[#10b981]" />
                                        </div>
                                        < div className="text-left" >
                                            <p className="text-lg font-bold text-white" > {file.name} </p>
                                            < p className="text-white/20 text-xs font-bold uppercase tracking-widest" > {(file.size / 1024).toFixed(0)
                                            } KB & bull; Verified </p>
                                        </div>
                                        < CheckCircle2 className="w-6 h-6 text-[#10b981] ml-4" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform" >
                                            <Upload className="w-10 h-10 text-white/20 group-hover:text-[#6366f1] transition-colors" />
                                        </div>
                                        < div className="text-center space-y-2" >
                                            <p className="text-xl font-bold text-white" > Select Resume File </p>
                                            < p className="text-white/30 text-sm font-bold uppercase tracking-widest" > PDF & DOCX ONLY & bull; 100 % PRIVATE </p>
                                        </div>
                                    </>
                                )}
                        </div>
                        < div className="space-y-4" >
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Paste requirements to sync skills..."
                                className="w-full h-40 bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-sm text-white focus:ring-2 focus:ring-[#6366f1]/40 focus:outline-none transition-all resize-none font-medium placeholder:text-white/10"
                            />
                        </div>
                        {
                            error && (
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }
                                } className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold" >
                                    <AlertCircle className="w-5 h-5" /> {error}
                                </motion.div>
                            )}
                        <button
                            onClick={handleScan}
                            disabled={isScanning || !file}
                            className={
                                cn(
                                    "w-full py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden",
                                    "bg-[#6366f1] text-white shadow-2xl shadow-[#6366f1]/20 hover:brightness-110"
                                )
                            }
                        >
                            Launch System Simulation
                        </button>
                    </div>
                )}
        </div>
    );
}