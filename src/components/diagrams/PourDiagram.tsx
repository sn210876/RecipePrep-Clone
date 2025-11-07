export function PourDiagram() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(60, 30)">
        <rect
          x="10"
          y="0"
          width="60"
          height="50"
          fill="none"
          stroke="#059669"
          strokeWidth="3"
          rx="2"
        />
        <ellipse cx="40" cy="0" rx="30" ry="8" fill="#10b981" opacity="0.3" />
        <rect x="15" y="10" width="50" height="30" fill="#10b981" opacity="0.4" />

        <rect
          x="65"
          y="15"
          width="15"
          height="8"
          fill="#059669"
          rx="1"
        />
      </g>

      <g className="animate-[pour_2s_ease-in-out_infinite]">
        <path
          d="M 135 60 Q 138 80 140 100"
          stroke="#10b981"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>

      <g transform="translate(50, 110)">
        <ellipse cx="90" cy="50" rx="50" ry="15" fill="#10b981" opacity="0.2" />
        <path
          d="M 40 50 Q 40 75 90 80 Q 140 75 140 50 L 135 35 Q 135 25 90 22 Q 45 25 45 35 Z"
          fill="none"
          stroke="#059669"
          strokeWidth="3"
        />
        <ellipse
          cx="90"
          cy="50"
          rx="48"
          ry="13"
          fill="#10b981"
          opacity="0.3"
          className="animate-[fillUp_2s_ease-in-out_infinite]"
        />
      </g>

      <style>{`
        @keyframes pour {
          0%, 100% { opacity: 0; transform: translateY(-10px); }
          50% { opacity: 0.7; transform: translateY(0px); }
        }
        @keyframes fillUp {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </svg>
  );
}
