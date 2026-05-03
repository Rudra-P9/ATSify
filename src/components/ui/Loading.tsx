/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, BrainCircuit, FileBarChart, Search, Sparkles, ScrollText, Database, ShieldCheck, Microscope, Globe, Clock } from 'lucide-react';

interface LoadingProps {
  status: string;
  step: number; // 1-5
  facts?: string[];
}

const Loading: React.FC<LoadingProps> = ({ status, step, facts = [
  "99% of Fortune 500 companies use ATS to filter resumes.",
  "An average ATS filters out 75% of candidates before a human sees them.",
  "Tailoring keywords can increase your response rate by 40%.",
  "Workday is the most widely used ATS in the tech industry.",
  "Logical section headings help ATS parsers categorize your data correctly.",
  "Standard fonts like Inter and Arial are best for high-accuracy parsing.",
  "Quantifying achievements (using numbers) is the top signal recruiters look for.",
  "The average time spent looking at a resume is just 6 seconds."
] }) => {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  
  useEffect(() => {
    if (facts.length > 0) {
      const interval = setInterval(() => {
        setCurrentFactIndex((prev) => (prev + 1) % facts.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [facts]);

  const FlyingItem = ({ delay, position, type, content }: { delay: number, position: number, type: 'icon' | 'text', content: any }) => {
    const startLeft = position % 2 === 0 ? '-20%' : '120%';
    const startTop = `${(position * 7) % 100}%`;
    
    return (
      <div 
        className={`absolute flex items-center justify-center font-bold opacity-0 select-none ${type === 'text' ? 'text-cyan-600 dark:text-cyan-400 text-[10px] md:text-xs tracking-[0.2em] bg-white/80 dark:bg-slate-900/80 border border-cyan-500/30 px-2 py-0.5 md:px-3 md:py-1 rounded shadow-[0_0_10px_rgba(6,182,212,0.3)] backdrop-blur-sm' : 'text-amber-500 dark:text-amber-400'}`}
        style={{
          animation: `implode 2.5s infinite ease-in ${delay}s`,
          top: startTop,
          left: startLeft,
          zIndex: 10,
        }}
      >
        {type === 'icon' ? React.createElement(content, { className: "w-5 h-5 md:w-6 md:h-6 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" }) : content}
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-4xl mx-auto mt-8 min-h-[400px] md:min-h-[550px] overflow-hidden rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] shadow-2xl backdrop-blur-md transition-colors">
      
      {/* THE SCANNER ANIMATION (Replaced Reactor Core) */}
      <div className="relative z-20 mb-10 md:mb-16 mt-4 md:mt-10 perspective-1000">
        <motion.div 
          initial={{ rotateY: 20, rotateX: 10, y: 0 }}
          animate={{ rotateY: [20, -10, 20], rotateX: [10, 5, 10], y: [0, -10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-36 h-52 md:w-48 md:h-64 bg-[#050507] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center pt-8 md:pt-12 gap-4 group backdrop-blur-3xl"
        >
          {/* Scan Line */}
          <div className="absolute w-full h-1 bg-cyan-400/60 blur-[3px] animate-[scan-line_3s_linear_infinite]"></div>
          <div className="absolute w-full h-[1px] bg-white opacity-40 animate-[scan-line_3s_linear_infinite]"></div>
          
          {/* Holographic Grid Background */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(6,182,212,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:12px_12px]"></div>

          {/* Icon Content */}
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)] relative z-10">
              <FileBarChart className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>

          {/* Data Lines representing different extraction types */}
          <div className="w-24 md:w-32 space-y-3 relative z-10">
              <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(step * 25, 100)}%` }}
                  className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                />
              </div>
              <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(step * 18, 90)}%` }}
                  className="h-full bg-indigo-500 delay-100"
                />
              </div>
              <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(step * 22, 95)}%` }}
                  className="h-full bg-purple-500 delay-200"
                />
              </div>
          </div>
          
          {/* Status Label on "Paper" */}
          <div className="absolute bottom-6 left-0 right-0 px-6">
            <div className="h-[1px] w-full bg-white/10 mb-2" />
            <div className="flex justify-between items-center text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
               <span className="flex items-center gap-1.5">
                 <div className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse" />
                 Processing_Node
               </span>
               <span className="text-cyan-500/50">SECURE_SYNC</span>
            </div>
          </div>
        </motion.div>

        {/* Orbiting Particles back to core - adapted to new card center */}
        <div className="absolute top-1/2 left-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10">
           <FlyingItem content={Globe} type="icon" delay={0} position={1} />
           <FlyingItem content="V_SYNC" type="text" delay={0.2} position={2} />
           <FlyingItem content={Microscope} type="icon" delay={0.5} position={3} />
           <FlyingItem content="SEMANTIC" type="text" delay={0.7} position={4} />
           <FlyingItem content={Sparkles} type="icon" delay={1.0} position={5} />
           <FlyingItem content="AI_PARSER" type="text" delay={1.2} position={6} />
           <FlyingItem content={ShieldCheck} type="icon" delay={1.5} position={7} />
           <FlyingItem content="P_ENCRYPTION" type="text" delay={1.7} position={8} />
        </div>
      </div>

      {/* Fact Display */}
      <div className="relative z-30 w-full max-w-lg bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/5 text-center flex flex-col items-center transition-all duration-500 min-h-[160px]">
        
        <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_cyan]"></div>
            <h3 className="text-cyan-400 font-black text-xs tracking-[0.2em] uppercase font-display">
            {status}
            </h3>
        </div>

        <div className="flex-1 flex items-center justify-center px-4">
            <div key={currentFactIndex} className="animate-in slide-in-from-bottom-4 fade-in duration-700">
                <p className="text-lg md:text-xl text-white/80 font-medium leading-relaxed italic">
                "{facts[currentFactIndex]}"
                </p>
            </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/5 mt-8 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 via-[#6366f1] to-purple-500 transition-all duration-1000 ease-out relative overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.6)]"
              style={{ width: `${Math.min(step * 20 + 5, 100)}%` }}
            >
                <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
            </div>
        </div>
        <div className="mt-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
            Step {step} of 5 • {status === "Analyzing..." ? "AI Processing" : "Deterministic Engine"}
        </div>
      </div>

    </div>
  );
};

export default Loading;
