// Dependency-free confetti burst for the "everything packed!" moment.
// Spawns a short-lived full-screen canvas, animates paper bits, then cleans up.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  shape: 0 | 1; // rectangle | circle
}

// Sunset Voyage palette.
const COLORS = ["#e8543f", "#f59e0b", "#14b8a6", "#fcd34d", "#fb7185", "#ffffff"];

let running = false;

export function celebrate(): void {
  if (typeof window === "undefined" || running) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  running = true;

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    running = false;
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];
  // Two fountains from the lower corners arcing toward the centre.
  const bursts = [
    { x: W * 0.18, dir: 1 },
    { x: W * 0.82, dir: -1 },
  ];
  for (const b of bursts) {
    for (let i = 0; i < 80; i++) {
      const angle = (-Math.PI / 2) + b.dir * (Math.random() * 0.6 + 0.1);
      const speed = Math.random() * 9 + 7;
      particles.push({
        x: b.x,
        y: H + 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 7 + 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        shape: Math.random() > 0.5 ? 0 : 1,
      });
    }
  }

  const gravity = 0.22;
  const drag = 0.992;
  const start = performance.now();
  const LIFE = 2600;

  const frame = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);
    const fade = Math.max(0, 1 - elapsed / LIFE);

    for (const p of particles) {
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 0) {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (elapsed < LIFE) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
      running = false;
    }
  };

  requestAnimationFrame(frame);
}
