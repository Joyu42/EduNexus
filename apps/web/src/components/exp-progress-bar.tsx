'use client';

interface ExpProgressBarProps {
  currentExp: number;
  maxExp: number;
  label?: string;
  showNumbers?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ExpProgressBar({
  currentExp,
  maxExp,
  label,
  showNumbers = true,
  size = 'md',
  className = ''
}: ExpProgressBarProps) {
  const percentage = Math.min(100, (currentExp / maxExp) * 100);

  const heightClass = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }[size];

  const textSizeClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }[size];

  return (
    <div className={className}>
      {(label || showNumbers) && (
        <div className={`flex items-center justify-between mb-1 ${textSizeClass}`}>
          {label && <span className="text-muted-foreground">{label}</span>}
          {showNumbers && (
            <span className="font-medium">
              {currentExp.toLocaleString()} / {maxExp.toLocaleString()}
            </span>
          )}
        </div>
      )}
      <div className={`relative w-full bg-secondary rounded-full overflow-hidden ${heightClass}`}>
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>
      {showNumbers && (
        <p className="mt-1 text-xs text-muted-foreground text-right">
          {percentage.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
