interface SafetyBadgeProps {
  score: number | null;
  violations?: string[];
}

export default function SafetyBadge({ score, violations = [] }: SafetyBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-gray-700/50 text-gray-500">
        N/A
      </span>
    );
  }

  const color =
    score >= 80
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
      : score >= 50
        ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
        : 'bg-red-500/15 text-red-400 border-red-500/20';

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
        {Math.round(score)}
      </span>
      {violations.length > 0 && (
        <span className="text-xs text-red-400" title={violations.join(', ')}>
          {violations.length} issue{violations.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
