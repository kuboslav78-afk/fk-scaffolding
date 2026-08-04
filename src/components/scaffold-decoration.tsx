function ScaffoldBay({ y, flip, gradId }: { y: number; flip: boolean; gradId: string }) {
  const diag = flip ? "M12,0 L88,112" : "M88,0 L12,112";
  return (
    <g transform={`translate(0, ${y})`}>
      <line x1="12" y1="0" x2="12" y2="112" stroke={`url(#${gradId})`} strokeWidth="4" strokeLinecap="round" />
      <line x1="88" y1="0" x2="88" y2="112" stroke={`url(#${gradId})`} strokeWidth="4" strokeLinecap="round" />
      <line x1="12" y1="0" x2="88" y2="0" stroke={`url(#${gradId})`} strokeWidth="3" strokeLinecap="round" />
      <path d={diag} stroke={`url(#${gradId})`} strokeWidth="1.8" opacity="0.55" strokeLinecap="round" />
      <circle cx="12" cy="0" r="3.4" fill={`url(#${gradId})`} />
      <circle cx="88" cy="0" r="3.4" fill={`url(#${gradId})`} />
    </g>
  );
}

function ScaffoldTower({ bays = 7, gradId }: { bays?: number; gradId: string }) {
  const height = bays * 112 + 14;
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      width="100"
      height={height}
      fill="none"
      className="h-full w-auto drop-shadow-[0_18px_28px_rgba(180,75,12,0.18)]"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-brand-300)" />
          <stop offset="50%" stopColor="var(--color-brand-600)" />
          <stop offset="100%" stopColor="var(--color-brand-800)" />
        </linearGradient>
      </defs>

      {Array.from({ length: bays }).map((_, i) => (
        <ScaffoldBay key={i} y={i * 112} flip={i % 2 === 0} gradId={gradId} />
      ))}
      <line x1="12" y1={height - 14} x2="12" y2={height} stroke={`url(#${gradId})`} strokeWidth="4" strokeLinecap="round" />
      <line x1="88" y1={height - 14} x2="88" y2={height} stroke={`url(#${gradId})`} strokeWidth="4" strokeLinecap="round" />

      {Array.from({ length: bays }).map((_, i) =>
        i % 2 === 1 ? (
          <rect
            key={`plank-${i}`}
            x="7"
            y={i * 112 - 4.5}
            width="86"
            height="7"
            rx="2"
            fill={`url(#${gradId})`}
            opacity="0.9"
          />
        ) : null
      )}

      {/* pulsing beacon on top */}
      <circle cx="50" cy="-6" r="4.5" fill="var(--color-brand-500)" className="animate-beacon-pulse" />
    </svg>
  );
}

export function ScaffoldDecoration({ side }: { side: "left" | "right" }) {
  const gradId = `scaffold-grad-${side}`;
  return (
    <div
      aria-hidden="true"
      className={
        side === "left"
          ? "pointer-events-none absolute inset-y-0 left-0 hidden w-40 items-center overflow-hidden text-brand-600/30 lg:flex xl:w-52 2xl:w-64"
          : "pointer-events-none absolute inset-y-0 right-0 hidden w-40 items-center justify-end overflow-hidden text-brand-600/30 lg:flex xl:w-52 2xl:w-64"
      }
      style={{ perspective: "1200px" }}
    >
      {/* soft blurred depth echo */}
      <div
        className={
          (side === "left" ? "animate-scaffold-left" : "animate-scaffold-right") +
          " absolute opacity-40 blur-sm"
        }
        style={{ transform: "translateX(6px) scale(0.97)" }}
      >
        <ScaffoldTower bays={7} gradId={`${gradId}-echo`} />
      </div>

      <div className={side === "left" ? "animate-scaffold-left" : "animate-scaffold-right"}>
        <ScaffoldTower bays={7} gradId={gradId} />
      </div>
    </div>
  );
}
