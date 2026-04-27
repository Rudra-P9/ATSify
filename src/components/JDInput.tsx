import React, { useState, useMemo } from 'react';
import {
    Search,
    FileText,
    Sparkles,
    ChevronRight,
    History,
    Info,
    X,
    Target
} from 'lucide-react';
import { useResume } from '../store/useResume';
import { useJDLibrary } from '../store/jdLibrary';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function JDInput() {
    const { jobDescription, setJobDescription } = useResume();
    const { samples } = useJDLibrary();
    const [showLibrary, setShowLibrary] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    const wordCount = useMemo(() => {
        const trimmed = jobDescription.trim();
        return trimmed ? trimmed.split(/\s+/).length : 0;
    }, [jobDescription]);

    const selectSample = (text: string) => {
        setJobDescription(text);
        setShowLibrary(false);
        setActiveTab('edit');
    };

    return (
        <div className= "w-full space-y-4" >
        <div className="flex items-center justify-between" >
            <div className="flex items-center gap-2" >
                <Target className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest" >
                        Job Description Target
                            </h3>
                            </div>
                            < div className = "flex items-center gap-2" >
                                <button 
             onClick={ () => setShowLibrary(!showLibrary) }
    className = {
        cn(
               "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
            showLibrary? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
        )
    }
        >
        <History className="w-3 h-3" />
            JD Library
                </button>
                < div className = "h-4 w-[1px] bg-white/10 mx-1" />
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10" >
                        <button 
                onClick={ () => setActiveTab('edit') }
    className = {
        cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === 'edit' ? "bg-white/10 text-white shadow-sm" : "text-white/30 hover:text-white/50"
                )
}
              >
    Edit
    </button>
    < button
onClick = {() => setActiveTab('preview')}
className = {
    cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
        activeTab === 'preview' ? "bg-white/10 text-white shadow-sm" : "text-white/30 hover:text-white/50"
                )}
              >
    Preview
    </button>
    </div>
    </div>
    </div>

    < div className = "relative group" >
        <AnimatePresence mode="wait" >
        {
            showLibrary?(
            <motion.div 
              key="library"
              initial={{ opacity: 0, y: 10 }}
animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, y: 10 }}
className = "bg-[#0c0c0f] border border-white/10 rounded-2xl p-4 space-y-3 z-10"
    >
    <div className="flex items-center justify-between mb-2" >
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest" > Sample Templates </span>
            < button onClick = {() => setShowLibrary(false)} className = "text-white/20 hover:text-white" >
                <X className="w-3.5 h-3.5" />
                    </button>
                    </div>
                    < div className = "grid grid-cols-1 sm:grid-cols-2 gap-2" >
                    {
                        samples.map(sample => (
                            <button 
                     key= { sample.id }
                     onClick = {() => selectSample(sample.text)}
className = "text-left p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group/item"
    >
    <div className="text-xs font-bold text-white group-hover/item:text-indigo-400 transition-colors" > { sample.title } </div>
        < div className = "text-[9px] text-white/30 uppercase tracking-widest mt-1" > Ready to sync </div>
            </button>
                 ))}
</div>
    </motion.div>
          ) : activeTab === 'edit' ? (
    <motion.div
              key= "edit"
              initial = {{ opacity: 0 }}
animate = {{ opacity: 1 }}
exit = {{ opacity: 0 }}
            >
    <textarea 
                value={ jobDescription }
onChange = {(e) => setJobDescription(e.target.value)}
placeholder = "Paste the job description here for deep skill matching and AI-powered feedback..."
className = "w-full h-48 bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:outline-none transition-all resize-none font-medium placeholder:text-white/10 custom-scrollbar"
    />
    <div className="absolute bottom-4 right-4 flex items-center gap-3" >
        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]" > { wordCount } Words </div>
            < div className = "h-3 w-[1px] bg-white/10" />
                <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500/60 uppercase tracking-widest" >
                    <Sparkles className="w-3 h-3" />
                        AI Ready
                            </div>
                            </div>
                            </motion.div>
          ) : (
    <motion.div
              key= "preview"
initial = {{ opacity: 0 }}
animate = {{ opacity: 1 }}
exit = {{ opacity: 0 }}
className = "w-full h-48 bg-white/[0.01] border border-white/5 rounded-2xl p-6 overflow-y-auto custom-scrollbar"
    >
{
    jobDescription?(
                 <div className = "prose prose-invert prose-sm max-w-none" >
        {
            jobDescription.split('\n').map((line, i) => (
                <p key= { i } className = "mb-2 text-white/60 leading-relaxed" > { line } </p>
            ))
}
    </div>
               ) : (
    <div className= "h-full flex flex-col items-center justify-center text-center space-y-3 opacity-30" >
    <Info className="w-8 h-8" />
        <p className="text-xs font-bold uppercase tracking-widest text-white" > No content to preview </p>
            </div>
               )}
</motion.div>
          )}
</AnimatePresence>
    </div>

    < div className = "flex items-start gap-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl relative overflow-hidden group" >
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity" >
            <Sparkles className="w-12 h-12 text-indigo-500" />
                </div>
                < div className = "w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5" >
                    <Search className="w-4 h-4 text-indigo-400" />
                        </div>
                        < div className = "space-y-1" >
                            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest" > Strategy Tip </p>
                                < p className = "text-[11px] text-white/50 leading-relaxed" >
                                    We'll use this description to detect {jobDescription ? 'matching' : 'potential'} keywords, industry-specific quirks, and role requirements for each ATS platform.
                                        </p>
                                        </div>
                                        </div>
                                        </div>
  );
}