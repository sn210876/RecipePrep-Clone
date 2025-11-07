export function StirDiagram() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="100" cy="100" rx="70" ry="30" fill="#10b981" opacity="0.2" />

      <path
        d="M 30 100 Q 30 140 100 150 Q 170 140 170 100 Q 170 70 100 60 Q 30 70 30 100"
        fill="none"
        stroke="#059669"
        strokeWidth="3"
      />

      <g className="animate-[stir_3s_ease-in-out_infinite]">
        <line
          x1="100"
          y1="40"
          x2="100"
          y2="100"
          stroke="#1f2937"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="8" fill="#374151" />
      </g>

      <circle
        cx="140"
        cy="95"
        r="4"
        fill="#10b981"
        className="animate-[moveAround_3s_ease-in-out_infinite]"
      />
      <circle
        cx="60"
        cy="105"
        r="4"
        fill="#10b981"
        className="animate-[moveAround_3s_ease-in-out_infinite_1s]"
      />
      <circle
        cx="100"
        cy="130"
        r="4"
        fill="#10b981"
        className="animate-[moveAround_3s_ease-in-out_infinite_2s]"
      />

      <style>{`
        @keyframes stir {
          0% { transform: rotate(0deg) translateX(30px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
        }
        @keyframes moveAround {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
