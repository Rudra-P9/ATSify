import React, { useState } from 'react';
import { FileText, X, Sparkles, AlertCircle, Type } from 'lucide-react';
import { useResume } from '../store/useResume';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ResumeTextInputProps {
    onTabChange?: () => void;
}

export default function ResumeTextInput({ onTabChange }: ResumeTextInputProps) {
    const { setFile, resumeText = '', setResumeText } = useResume() as any; // Using any as I might need to update the store
    const [error, setError] = useState('');

    const wordCount = resumeText ? resumeText.trim().split(/\s+/).length : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                        Paste Resume Text
                    </h3>
                </div>
            </div>

            <div className="relative">
                <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText?.(e.target.value)}
                    placeholder="Paste your plain-text resume here... (Make sure to preserve headers)"
                    className="w-full h-64 bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:outline-none transition-all resize-none font-medium placeholder:text-white/10 custom-scrollbar"
                />

                <div className="absolute bottom-4 right-4 flex items-center gap-4">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{wordCount} Words</div>
                    {resumeText && (
                        <button
                            onClick={() => setResumeText?.('')}
                            className="p-1 hover:bg-white/5 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-white/40" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                <AlertCircle className="w-4 h-4 text-yellow-500/60 shrink-0 mt-0.5" />
                <p className="text-[11px] text-white/50 leading-relaxed">
                    Text-based input bypasses layout scanning penalties. For the most accurate ATS simulation (including parseability checks), we recommend <button onClick={onTabChange} className="text-yellow-500/70 hover:text-yellow-500 underline font-bold">uploading a PDF file</button>.
                </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">
                <Sparkles className="w-3 h-3" />
                Raw Text Processing Mode
            </div>
        </div>
    );
}
