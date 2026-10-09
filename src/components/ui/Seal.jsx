/**
 * The product's signature element: a circular seal/medallion motif.
 * Used for progress indicators, achievement badges, and echoes the
 * certificate design. Threading one motif through dashboards,
 * certificates, and profile badges is what ties the UI together.
 */
export function ProgressRing({ value = 0, size = 56, stroke = 5, label, showValue = true }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--color-border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-gold)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {showValue && (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold text-ink">
          {Math.round(value)}%
        </span>
      )}
      {label && <span className="text-xs text-muted mt-1">{label}</span>}
    </div>
  );
}

export function SealBadge({ size = 40, className = "" }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-[30%] brand-gradient shadow-lg shadow-ink/20 ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-[3px] rounded-[24%] bg-white/95 flex items-center justify-center">
        <span className="font-display text-ink font-semibold" style={{ fontSize: size * 0.36 }}>
          e
        </span>
        <span className="absolute right-[15%] bottom-[19%] w-[18%] h-[18%] rounded-full bg-gold" />
      </div>
      <span className="sr-only">
        Eduspire
      </span>
    </div>
  );
}
