export function ScoreHeader({ averageScore, systemsPassed }: any) {
  return (
    <div className="glass p-10 rounded-[3rem] border-white/5 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
      <div className="text-center">
         <div className="text-8xl font-black">{averageScore}</div>
         <div className="text-[10px] text-white/20 uppercase">Global Aggregate</div>
      </div>
      <div className="flex-1 space-y-4">
         <div className="text-5xl font-black">{systemsPassed}/6</div>
         <div className="text-[10px] text-white/30 uppercase">Systems Passed</div>
      </div>
    </div>
  );
}
