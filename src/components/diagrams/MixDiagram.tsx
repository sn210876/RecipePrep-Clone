export function MixDiagram() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="100" cy="120" rx="65" ry="45" fill="#10b981" opacity="0.2" />

      <path
        d="M 40 110 Q 40 150 100 160 Q 160 150 160 110 L 155 90 Q 155 80 100 75 Q 45 80 45 90 Z"
        fill="none"
        stroke="#059669"
        strokeWidth="3"
      />

      <g className="animate-[mix_2s_ease-in-out_infinite]">
        <path
          d="M 70 120 Q 100 100 130 120"
          stroke="#1f2937"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 65 130 Q 100 150 135 130"
          stroke="#374151"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      <path
        d="M 80 115 L 85 105"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        className="animate-[float_1.5s_ease-in-out_infinite]"
      />
      <path
        d="M 120 115 L 115 105"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        className="animate-[float_1.5s_ease-in-out_infinite_0.5s]"
      />

      <style>{`
        @keyframes mix {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(-5px) scaleY(0.95); }
        }
        @keyframes float {
          0%, 100% { opacity: 0; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-10px); }
        }
      `}</style>
    </svg>
  );
}
