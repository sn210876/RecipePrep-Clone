export function ChopDiagram() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="20" y="140" width="160" height="20" fill="#10b981" opacity="0.2" rx="2" />

      <rect x="50" y="150" width="100" height="8" fill="#059669" rx="1" />

      <g className="animate-[chop_1.5s_ease-in-out_infinite]">
        <path
          d="M 100 40 L 105 120 L 95 120 Z"
          fill="#1f2937"
          stroke="#111827"
          strokeWidth="2"
        />
        <rect x="90" y="30" width="20" height="15" fill="#374151" rx="2" />
      </g>

      <line
        x1="70"
        y1="155"
        x2="130"
        y2="155"
        stroke="#10b981"
        strokeWidth="2"
        strokeDasharray="4 4"
        className="animate-pulse"
      />

      <style>{`
        @keyframes chop {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </svg>
  );
}
