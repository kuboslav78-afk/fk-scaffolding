function ScaffoldBay({ y, flip }: { y: number; flip: boolean }) {
  const diag = flip ? "M10,0 L90,110" : "M90,0 L10,110";
  return (
    <g transform={`translate(0, ${y})`}>
      <line x1="10" y1="0" x2="10" y2="110" stroke="currentColor" strokeWidth="3" />
      <line x1="90" y1="0" x2="90" y2="110" stroke="currentColor" strokeWidth="3" />
      <line x1="10" y1="0" x2="90" y2="0" stroke="currentColor" strokeWidth="2.5" />
      <path d={diag} stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
      <circle cx="10" cy="0" r="3" fill="currentColor" />
      <circle cx="90" cy="0" r="3" fill="currentColor" />
    </g>
  );
}

function ScaffoldTower({ bays = 6 }: { bays?: number }) {
  const height = bays * 110 + 12;
  return (
    <svg viewBox={`0 0 100 ${height}`} width="100" height={height} fill="none" className="h-full w-auto">
      {Array.from({ length: bays }).map((_, i) => (
        <ScaffoldBay key={i} y={i * 110} flip={i % 2 === 0} />
      ))}
      <line x1="10" y1={height - 12} x2="10" y2={height} stroke="currentColor" strokeWidth="3" />
      <line x1="90" y1={height - 12} x2="90" y2={height} stroke="currentColor" strokeWidth="3" />
      {/* platform planks every other bay */}
      {Array.from({ length: bays }).map((_, i) =>
        i % 2 === 1 ? (
          <rect
            key={`plank-${i}`}
            x="6"
            y={i * 110 - 4}
            width="88"
            height="6"
            rx="1.5"
            fill="currentColor"
            opacity="0.85"
          />
        ) : null
      )}
    </svg>
  );
}

export function ScaffoldDecoration({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden="true"
      className={
        side === "left"
          ? "pointer-events-none absolute inset-y-0 left-0 hidden w-28 items-center overflow-hidden text-brand-600/25 lg:flex xl:w-36"
          : "pointer-events-none absolute inset-y-0 right-0 hidden w-28 items-center justify-end overflow-hidden text-brand-600/25 lg:flex xl:w-36"
      }
    >
      <div className={side === "left" ? "animate-scaffold-left" : "animate-scaffold-right"}>
        <ScaffoldTower bays={7} />
      </div>
    </div>
  );
}
