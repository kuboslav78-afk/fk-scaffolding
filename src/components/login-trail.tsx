export function LoginTrail() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -inset-px h-[calc(100%+2px)] w-[calc(100%+2px)]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <rect
        x="0.8"
        y="0.8"
        width="98.4"
        height="98.4"
        rx="9"
        ry="9"
        pathLength={100}
        fill="none"
        stroke="#5fb3ff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="13 87"
        vectorEffect="non-scaling-stroke"
        className="animate-trail-a"
        style={{
          filter: "drop-shadow(0 0 3px #6fbeff) drop-shadow(0 0 9px rgba(111,190,255,0.75))",
        }}
      />
      <rect
        x="0.8"
        y="0.8"
        width="98.4"
        height="98.4"
        rx="9"
        ry="9"
        pathLength={100}
        fill="none"
        stroke="#bfe4ff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="13 87"
        vectorEffect="non-scaling-stroke"
        className="animate-trail-b"
        style={{
          filter: "drop-shadow(0 0 3px #6fbeff) drop-shadow(0 0 9px rgba(111,190,255,0.75))",
        }}
      />
    </svg>
  );
}
