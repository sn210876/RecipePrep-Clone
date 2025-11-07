export function WhiskDiagram() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="100" cy="120" rx="60" ry="40" fill="#10b981" opacity="0.2" />

      <ellipse cx="100" cy="120" rx="50" ry="35" fill="none" stroke="#059669" strokeWidth="2" />

      <g className="animate-[spin_2s_linear_infinite]" style={{ transformOrigin: '100px 100px' }}>
        <path
          d="M 100 60 L 95 110"
          stroke="#1f2937"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 100 110 L 90 115 L 88 120 L 90 125 L 95 128"
          stroke="#374151"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 100 110 L 110 115 L 112 120 L 110 125 L 105 128"
          stroke="#374151"
          strokeWidth="2"
          fill="none"
        />
      </g>

      <path
        d="M 140 100 Q 150 90 145 80"
        stroke="#10b981"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        className="animate-[fadeInOut_2s_ease-in-out_infinite]"
      />
      <path
        d="M 60 100 Q 50 90 55 80"
        stroke="#10b981"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        className="animate-[fadeInOut_2s_ease-in-out_infinite_0.5s]"
      />

      <style>{`
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
