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
import { cn } from '../../lib/utils';
import { parseDocument, parseText } from '../../lib/parser';
import { analyzeResume, ResumeMetadata, ATSResult } from '../../lib/gemini';
import Loading from '../ui/Loading';

export interface ScannerSectionProps {
    onResults: (results: ATSResult[], resume: string, jd: string, metadata: ResumeMetadata) => void;
}

export default function ScannerSection({ onResults }: ScannerSectionProps) {
    const [file, setFile] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
    const [progress, setProgress] = useState(0);
    const [completedPlatforms, setCompletedPlatforms] = useState<string[]>([]);
    const [error, setError] = useState('');

    const PLATFORMS = ['WORKDAY', 'TALEO', 'ICIMS', 'GREENHOUSE', 'LEVER', 'SUCCESSFACTORS'];

    type StepStatus = 'pending' | 'active' | 'completed';
    interface ProcessingStep {
        id: number;
        label: string;
    }

    const STEPS: ProcessingStep[] = [
        { id: 1, label: 'File Uploaded' },
        { id: 2, label: 'Scanning File' },
        { id: 3, label: 'Extracting Text' },
        { id: 4, label: 'Analyzing Content' },
        { id: 5, label: 'Scoring' },
        { id: 6, label: 'Completed' }
    ];

    const [currentStep, setCurrentStep] = useState(0);

    const handleScan = async () => {
        if (inputMode === 'upload' && !file) {
            setError("Please select a file first.");
            return;
        }
        if (inputMode === 'paste' && !resumeText.trim()) {
            setError("Please paste your resume text.");
            return;
        }
        
        setError('');
        setIsScanning(true);
        setCompletedPlatforms([]);
        setCurrentStep(1); // File Uploaded

        try {
            // Step 2: Scanning
            setCurrentStep(2);
            await new Promise(r => setTimeout(r, 800));

            // Step 3: Extracting
            setCurrentStep(3);
            let doc;
            if (inputMode === 'upload' && file) {
                doc = await parseDocument(file);
            } else {
                doc = parseText(resumeText);
            }
            const text = doc.rawText;

            if (!text || text.trim().length < 50) {
                throw new Error("could not extract any text from the file. it may be an image-based PDF or corrupted.");
            }

            // Step 4: Analyzing
            setCurrentStep(4);
            console.log("[ATSify-UI] Initiating analysis for:", inputMode === 'upload' ? file?.name : "Pasted Text");
            const response = await analyzeResume(doc, jobDescription);
            
            // Step 5: Scoring
            setCurrentStep(5);
            // Simulate platform scoring updates
            for (let i = 0; i < PLATFORMS.length; i++) {
                await new Promise(r => setTimeout(r, 400));
                setCompletedPlatforms(prev => [...prev, PLATFORMS[i]]);
            }

            // Step 6: Completed
            setCurrentStep(6);
            await new Promise(r => setTimeout(r, 600));

            onResults(response.results, text, jobDescription, response.metadata);
        } catch (err: any) {
            console.error("[Scanner] Scan error:", err);
            setError(err?.message || "Analysis failed. Please check your file.");
            setIsScanning(false);
            setCurrentStep(0);
        }
    };

    const getStepStatus = (index: number): StepStatus => {
        const stepNum = index + 1;
        if (currentStep > stepNum) return 'completed';
        if (currentStep === stepNum) return 'active';
        return 'pending';
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-16 animate-fade-in py-10" id="scanner-section">
            <div className="space-y-6 text-center px-4">
                <div className="inline-flex px-4 py-1.5 bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[#6366f1]/20">
                    Document Intelligence Engine
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-tight italic">
                    Tested on <br />
                    <span className="text-[#6366f1]">Real ATS Systems</span>
                </h2>
                <p className="text-white/60 text-base md:text-xl font-medium max-w-3xl mx-auto leading-relaxed">
                    Upload your resume or paste text content. Files are parsed client-side for 100% privacy and sovereign security.
                </p>
            </div>

            {
                isScanning ? (
                    <Loading 
                        status={STEPS[currentStep - 1]?.label || 'Initializing System...'} 
                        step={currentStep} 
                    />
                ) : (
                    <div className="flex flex-col gap-10 w-full" >
                        <div className="flex justify-center">
                            <div className="flex p-2 bg-white/[0.03] rounded-[2rem] border border-white/5 backdrop-blur-md shadow-2xl">
                                <button 
                                    onClick={() => setInputMode('upload')}
                                    className={cn(
                                        "px-10 py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300",
                                        inputMode === 'upload' ? "bg-[#6366f1] text-white shadow-xl shadow-[#6366f1]/30" : "text-white/50 hover:text-white/70"
                                    )}
                                >
                                    File Upload
                                </button>
                                <button 
                                    onClick={() => setInputMode('paste')}
                                    className={cn(
                                        "px-10 py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300",
                                        inputMode === 'paste' ? "bg-[#6366f1] text-white shadow-xl shadow-[#6366f1]/30" : "text-white/50 hover:text-white/70"
                                    )}
                                >
                                    Paste Text
                                </button>
                            </div>
                        </div>

                        <div className="w-full">
                            {inputMode === 'upload' ? (
                                <div
                                    className={cn(
                                        "p-10 sm:p-20 rounded-[3rem] sm:rounded-[4rem] border-2 border-dashed flex flex-col items-center justify-center gap-8 sm:gap-12 transition-all group relative overflow-hidden cursor-pointer w-full",
                                        file ? "bg-[#6366f1]/5 border-[#6366f1]/40" : "bg-white/[0.02] border-white/10 hover:border-[#6366f1]/30 hover:bg-white/[0.04]"
                                    )}
                                    onClick={() => document.getElementById('resume-upload')?.click()}
                                >
                                    <input
                                        type="file"
                                        id="resume-upload"
                                        className="hidden"
                                        accept=".pdf,.docx"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                    {file ? (
                                        <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-700">
                                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#10b981]/10 rounded-3xl sm:rounded-[3rem] flex items-center justify-center border border-[#10b981]/20 shadow-[0_0_60px_rgba(16,185,129,0.15)] group-hover:scale-105 transition-transform">
                                                <FileText className="w-10 h-10 sm:w-14 sm:h-14 text-[#10b981]" />
                                            </div>
                                            <div className="text-center space-y-3">
                                                <p className="text-2xl sm:text-4xl font-black text-white text-glow truncate max-w-[280px] sm:max-w-md italic tracking-tight">{file.name}</p>
                                                <p className="text-[#10b981] text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                                                    <CheckCircle2 className="w-4 h-4" /> Secure Protocol • Ready for Scan
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-10">
                                            <div className="w-28 h-28 sm:w-36 sm:h-36 bg-white/[0.03] rounded-3xl sm:rounded-[3.5rem] flex items-center justify-center group-hover:scale-110 transition-all duration-700 border border-white/5 shadow-2xl relative">
                                                <div className="absolute inset-0 bg-[#6366f1]/10 rounded-3xl sm:rounded-[3.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 group-hover:text-[#6366f1] transition-colors relative z-10" />
                                            </div>
                                            <div className="text-center space-y-4 px-6">
                                                <p className="text-3xl sm:text-5xl font-black text-white tracking-tighter italic">Import Intelligence</p>
                                                <p className="text-white/40 text-[10px] sm:text-xs font-black uppercase tracking-[0.5em]">PDF or DOCX • 100% PRIVATE</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6 w-full">
                                    <textarea
                                        value={resumeText}
                                        onChange={(e) => setResumeText(e.target.value)}
                                        placeholder="Paste your full resume text here..."
                                        className="w-full h-80 sm:h-[450px] bg-white/[0.02] border border-white/10 rounded-[3rem] sm:rounded-[4rem] p-10 sm:p-14 text-sm sm:text-lg text-white focus:ring-8 focus:ring-[#6366f1]/10 focus:outline-none transition-all resize-none font-medium placeholder:text-white/10 text-center leading-relaxed"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="w-full text-center space-y-8">
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.4em] italic">Environmental Target (Job Description)</h3>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste requirements to calibrate the simulation..."
                                    className="w-full h-40 sm:h-60 bg-white/[0.02] border border-white/10 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 text-sm sm:text-base text-white focus:ring-4 focus:ring-[#6366f1]/20 focus:outline-none transition-all resize-none font-medium placeholder:text-white/10 text-center"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }} 
                                className="w-full p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] flex items-center justify-center gap-6 text-red-500 text-base font-black italic shadow-2xl"
                            >
                                <AlertCircle className="w-8 h-8" /> {error}
                            </motion.div>
                        )}
                        <button
                            onClick={handleScan}
                            disabled={isScanning || (inputMode === 'upload' ? !file : !resumeText.trim())}
                            className={
                                cn(
                                    "w-full py-8 sm:py-10 rounded-[2.5rem] sm:rounded-[3.5rem] font-black text-base sm:text-lg uppercase tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden italic",
                                    "bg-white text-[#050507] shadow-3xl shadow-white/5 hover:bg-[#6366f1] hover:text-white group"
                                )
                            }
                        >
                            <span className="relative z-10 flex items-center justify-center gap-4">
                                Launch Simulation <Search className="w-6 h-6" />
                            </span>
                        </button>
                    </div>
                )}
        </div>
    );
}
