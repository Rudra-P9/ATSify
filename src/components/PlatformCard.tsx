import { ATSProfile } from '../lib/platforms';

export function PlatformCard({ platform, score, report, isSelected, onClick }: any) {
  const isPass = score.overallScore >= 70;
  
  return (
    <div 
      className={`glass p-8 rounded-[2.5rem] space-y-8 transition-all border-white/5 hover:border-[#6366f1]/50 cursor-pointer ${isSelected ? 'bg-[#6366f1]/5 border-[#6366f1]/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-xl font-black text-white">{platform.name}</h4>
          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{platform.vendor}</p>
        </div>
        <div className="text-3xl font-black text-white">{score.overallScore}</div>
      </div>
      
      {/* Scoring Bars */}
      <div className="space-y-4">
        {[
          { l: 'Formatting', v: score.breakdown.formatting.score },
          { l: 'Keywords', v: score.breakdown.keywordMatch.score },
          { l: 'Structure', v: score.breakdown.sections.score },
          { l: 'Experience', v: score.breakdown.experience.score },
          { l: 'Education', v: score.breakdown.education.score }
        ].map(s => (
          <div key={s.l} className="space-y-1">
             <div className="flex justify-between text-[10px] font-bold text-white/60">
               <span>{s.l}</span><span>{s.v}%</span>
             </div>
             <div className="h-[4px] bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.v}%` }} />
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
