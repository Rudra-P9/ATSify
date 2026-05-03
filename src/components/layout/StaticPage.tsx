import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface StaticPageProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function StaticPage({ title, subtitle, icon, content }: StaticPageProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-12 py-12 px-4 sm:px-6 lg:px-8 text-left"
    >
      <div className="space-y-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#6366f1]/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#6366f1] border border-[#6366f1]/20">
          {icon}
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-[1.1] italic pr-4">{title}</h1>
          <p className="text-white/50 text-base sm:text-lg md:text-xl font-medium tracking-tight max-w-2xl">{subtitle}</p>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 space-y-6 sm:space-y-8 text-white/70 leading-relaxed text-base sm:text-lg">
        {content}
      </div>
    </motion.div>
  );
}
