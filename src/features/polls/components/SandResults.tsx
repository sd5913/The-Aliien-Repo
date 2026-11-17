import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import type { PollOption } from "../../../types/poll";
import { sandBoundary, sandColors } from "../utils/sandGeometry";

const grains = Array.from({ length: 620 }, (_, index) => ({
  x: ((index * 73.137) % 360),
  y: ((index * 137.519) % 360),
  size: .2 + (index % 4) * .1,
}));

const bubbles = Array.from({ length: 17 }, (_, index) => ({
  x: 22 + (index * 97.31) % 316,
  y: 18 + (index * 71.67) % 324,
  radius: 3 + (index * 7) % 14,
  phase: index * 1.7,
}));

export function SandResults({ options, counts }: { options: PollOption[]; counts: Map<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilt = useRef({ target: 0, current: 0 });
  const validTotal = options.reduce((sum, option) => sum + (counts.get(option.id) ?? 0), 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 360 * ratio;
    canvas.height = 360 * ratio;
    ctx.scale(ratio, ratio);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let phase = 0;
    let drift = 0;
    let visible = !document.hidden;
    const onVisibility = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || time - previous < 32) return;
      const dt = Math.min((time - previous) / 1000, .05);
      previous = time;
      tilt.current.current += (tilt.current.target - tilt.current.current) * (1 - Math.exp(-dt * 5));
      const gravity = reduced.matches ? -.5 : -.5 + tilt.current.current * .5;
      if (!reduced.matches) { phase += dt * .22; drift += dt * (2 + Math.abs(gravity) * 16); }
      ctx.clearRect(0, 0, 360, 360);
      ctx.fillStyle = "#f4effb";
      ctx.fillRect(0, 0, 360, 360);
      let cumulative = 0;
      options.forEach((option, index) => {
        const count = counts.get(option.id) ?? 0;
        if (!count || !validTotal) return;
        const start = cumulative;
        cumulative += count / validTotal;
        const end = cumulative;
        const boundary = (fraction: number, x: number) => sandBoundary(fraction, x / 360, gravity, phase) * 360;
        const path = new Path2D();
        for (let step = 0; step <= 72; step++) {
          const x = step * 5;
          if (!step) path.moveTo(x, boundary(start, x));
          else path.lineTo(x, boundary(start, x));
        }
        for (let step = 72; step >= 0; step--) path.lineTo(step * 5, boundary(end, step * 5));
        path.closePath();
        ctx.save();
        ctx.clip(path);
        ctx.fillStyle = sandColors[index % sandColors.length];
        ctx.fillRect(0, 0, 360, 360);
        const shimmer = Math.sin(phase * .8 + index * .7) * 45;
        const sheen = ctx.createLinearGradient(shimmer, 0, 330 + shimmer, 360);
        sheen.addColorStop(0, "#ffffff66");
        sheen.addColorStop(.28, "#f3dba126");
        sheen.addColorStop(.47, "#fff6cf55");
        sheen.addColorStop(.63, "#92754e18");
        sheen.addColorStop(.83, "#fff2ca40");
        sheen.addColorStop(1, "#ffffff66");
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, 360, 360);
        for (let grain = 0; grain < grains.length; grain++) {
          const particle = grains[grain];
          const x = ((particle.x + drift * gravity * (1 + grain % 3)) % 360 + 360) % 360;
          const y = (particle.y + drift * (.3 + grain % 4 * .15)) % 360;
          ctx.fillStyle = grain % 3 ? "#ffe6a647" : "#fff9e39c";
          ctx.fillRect(x, y, particle.size, particle.size);
        }
        ctx.strokeStyle = "#ffffff80";
        ctx.lineWidth = 9;
        ctx.stroke(path);
        ctx.restore();
        ctx.save();
        ctx.clip(path);
        bubbles.forEach((bubble) => {
          const bx = bubble.x + Math.sin(phase * 1.8 + bubble.phase) * 5;
          const by = bubble.y + Math.cos(phase * 1.3 + bubble.phase) * 7;
          const r = bubble.radius;
          const pearl = ctx.createRadialGradient(bx - r * .35, by - r * .4, 0, bx, by, r);
          pearl.addColorStop(0, "#ffffffa6");
          pearl.addColorStop(.35, "#ffffff30");
          pearl.addColorStop(.78, "#ffffff08");
          pearl.addColorStop(1, "#ffffff80");
          ctx.beginPath();
          ctx.arc(bx, by, r, 0, Math.PI * 2);
          ctx.fillStyle = pearl;
          ctx.fill();
          ctx.strokeStyle = "#ffffff8c";
          ctx.lineWidth = .7;
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(bx - r * .35, by - r * .45, r * .24, r * .1, -.6, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffffbf";
          ctx.fill();
        });
        ctx.restore();
        if (end - start < .075) return;
        const x = index % 2 ? 225 : 135;
        const y = boundary((start + end) / 2, x);
        const radius = Math.min(45, 18 + (end - start) * 42);
        const glass = ctx.createRadialGradient(x - radius / 3, y - radius / 2, 0, x, y, radius);
        glass.addColorStop(0, "#ffffffb0");
        glass.addColorStop(.75, "#ffffff28");
        glass.addColorStop(1, "#ffffffcc");
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 1.14, radius * .9, -.12, 0, Math.PI * 2);
        ctx.fillStyle = glass;
        ctx.fill();
        ctx.strokeStyle = "#ffffffaa";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#ffffffb0";
        ctx.beginPath();
        ctx.ellipse(x - radius * .5, y - radius * .5, radius * .23, radius * .09, -.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#411b65";
        ctx.textAlign = "center";
        const letterSize = Math.max(10, Math.round(radius * .43));
        const percentSize = Math.max(12, Math.round(radius * .62));
        const percentText = `${Math.round(count / validTotal * 100)}%`;
        ctx.font = `600 ${letterSize}px sans-serif`;
        ctx.fillText(String.fromCharCode(65 + index), x, y - radius * .15);
        ctx.font = `700 ${percentSize}px sans-serif`;
        const availableWidth = radius * 1.65;
        const fittedSize = Math.min(percentSize, percentSize * availableWidth / Math.max(1, ctx.measureText(percentText).width));
        ctx.font = `700 ${fittedSize}px sans-serif`;
        ctx.fillText(percentText, x, y + radius * .48);
      });
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [options, counts, validTotal]);

  const moveSand = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    tilt.current.target = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
  };

  return (
    <div className="sand-results">
      <div className="sand-stage" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); moveSand(event); }} onPointerMove={moveSand} onPointerUp={() => { tilt.current.target = 0; }} onPointerCancel={() => { tilt.current.target = 0; }}>
        <canvas ref={canvasRef} role="img" aria-label={validTotal ? `流沙投票结果。${options.map((option, index) => `${String.fromCharCode(65 + index)} ${option.name}：${Math.round((counts.get(option.id) ?? 0) / validTotal * 100)}%`).join("；")}` : "还没有投票，流沙区域为空"} />
        {!validTotal && <span className="sand-empty">等待第一份心意</span>}
      </div>

    </div>
  );
}
