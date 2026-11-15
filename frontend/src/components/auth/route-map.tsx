/** Decorative route map: faint road network with one amber route linking a few stops. */
export function RouteMap() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden
    >
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" stroke="currentColor" strokeOpacity="0.07" />
        </pattern>
      </defs>
      <rect width="600" height="800" fill="url(#grid)" />

      <g
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M-20 560C120 520 200 600 330 560S520 470 640 500" />
        <path d="M80 -20C110 140 60 260 160 380S300 560 280 820" />
        <path d="M420 -20C400 120 480 200 450 330S520 560 600 640" />
        <path d="M-20 240C100 260 220 200 330 250S520 330 640 290" />
      </g>

      <path
        d="M70 700C150 620 120 520 230 470S330 360 300 280S420 170 520 110"
        stroke="var(--accent)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="2 12"
      />
      <g fill="var(--accent)">
        <circle cx="70" cy="700" r="6" />
        <circle cx="230" cy="470" r="6" />
        <circle cx="300" cy="280" r="6" />
        <circle cx="520" cy="110" r="6" />
      </g>
      <g stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5">
        <circle cx="70" cy="700" r="16" />
        <circle cx="230" cy="470" r="16" />
        <circle cx="300" cy="280" r="16" />
        <circle cx="520" cy="110" r="16" />
      </g>
    </svg>
  );
}
