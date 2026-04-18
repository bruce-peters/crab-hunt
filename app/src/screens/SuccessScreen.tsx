import { useEffect, useRef } from "react";

interface SuccessScreenProps {
  user: { name: string; emoji: string };
  onBackToDashboard: () => void;
}

// A lightweight canvas-based confetti burst
function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = [
    "#ff595e",
    "#ffca3a",
    "#6a4c93",
    "#1982c4",
    "#8ac926",
    "#ff924c",
    "#ffffff",
  ];
  const PIECE_COUNT = 160;

  interface Piece {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vrot: number;
    w: number;
    h: number;
    color: string;
    opacity: number;
  }

  const pieces: Piece[] = Array.from({ length: PIECE_COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * -0.5 - 20,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.2,
    w: Math.random() * 10 + 6,
    h: Math.random() * 6 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: 1,
  }));

  let raf: number;
  let elapsed = 0;
  let last = performance.now();

  function tick(now: number) {
    const dt = (now - last) / 16.67;
    last = now;
    elapsed += dt;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of pieces) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.05 * dt; // gravity
      p.rot += p.vrot * dt;
      if (elapsed > 120) p.opacity = Math.max(0, p.opacity - 0.008 * dt);

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (elapsed < 300) {
      raf = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export function SuccessScreen({ user, onBackToDashboard }: SuccessScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cleanup = launchConfetti(canvasRef.current);

    const onResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      cleanup();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto min-h-dvh bg-[#0a0a0a] flex flex-col items-center justify-center px-6 overflow-hidden animate-fade-in">
      {/* Canvas sits behind content */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10"
      />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center text-center flex-1 justify-center">
        <div className="text-7xl mb-6 animate-bounce">🦀</div>

        <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
          You found it!
        </h1>

        <p className="text-white/50 text-lg mb-2">
          Congratulations, {user.name}!
        </p>

        <p className="text-white/30 text-sm leading-relaxed max-w-xs mb-10">
          The crab has been caught. The hunt is over. Enjoy your prize! 🎉
        </p>

        {/* Trophy */}
        <div className="w-24 h-24 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-5xl mb-8">
          🏆
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl">{user.emoji}</span>
          <span className="text-white/40 text-sm font-mono">{user.name}</span>
        </div>
      </div>

      {/* Back to dashboard */}
      <div className="relative z-20 w-full pb-10 pt-6">
        <button
          onClick={onBackToDashboard}
          className="w-full py-3 rounded-2xl border border-white/15 text-white/35 text-sm font-medium active:scale-[0.98] transition-all hover:border-white/30 hover:text-white/55"
        >
          ← Back to dashboard
        </button>
      </div>
    </div>
  );
}
