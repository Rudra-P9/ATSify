import { PlatformCard } from './PlatformCard';

export function PlatformGrid({ results, selectedSystem, onSelectSystem }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {results.map((r: any) => (
        <PlatformCard 
          key={r.platform.id}
          platform={r.platform}
          score={r.score}
          report={r.report}
          isSelected={selectedSystem === r.platform.id}
          onClick={() => onSelectSystem(r.platform.id)}
        />
      ))}
    </div>
  );
}
