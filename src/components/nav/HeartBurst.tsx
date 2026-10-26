"use client";

import { useEffect } from "react";

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

const HEART_COUNT = 18;
const DURATION_MS = 4500;

// "Naključni" a stalni položaji/velikosti srčkov (zlati rez po indeksu), da je
// izris čist (brez Math.random med renderjem).
const frac = (x: number) => x - Math.floor(x);
const HEARTS = Array.from({ length: HEART_COUNT }, (_, i) => ({
  id: i,
  left: frac(i * 0.618034) * 100,
  size: 16 + frac(i * 0.414214) * 22,
  delay: frac(i * 0.732051) * 1.2,
  duration: 2.6 + frac(i * 0.236068) * 1.6,
}));

/** Kratek prikaz srčkov s sporočilom; zapre se sam ali ob kliku. */
export default function HeartBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-black/10 backdrop-blur-[1px]"
      onClick={onDone}
      role="status"
    >
      <style>{`
        @keyframes heart-rise {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(-110vh) scale(1.1); opacity: 0; }
        }
        @keyframes heart-pop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .heart-rise, .heart-pop { animation: none !important; opacity: 1 !important; }
          .heart-rise { display: none; }
        }
      `}</style>

      {HEARTS.map((h) => (
        <span
          key={h.id}
          className="heart-rise pointer-events-none absolute bottom-[-3rem] text-pink-500 dark:text-pink-400"
          style={{
            left: `${h.left}%`,
            width: h.size,
            height: h.size,
            opacity: 0,
            animation: `heart-rise ${h.duration}s ease-out ${h.delay}s forwards`,
          }}
        >
          <HeartIcon className="h-full w-full" />
        </span>
      ))}

      <div
        className="heart-pop mx-4 flex items-center gap-2 rounded-xl bg-white px-5 py-4 text-center shadow-xl dark:bg-gray-900 dark:shadow-black/40"
        style={{ animation: "heart-pop 0.35s ease-out forwards" }}
      >
        <HeartIcon className="h-6 w-6 flex-shrink-0 text-pink-500 dark:text-pink-400" />
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Tina, ti si najboljša.
        </p>
      </div>
    </div>
  );
}
