import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import type { PollOption } from "../../../types/poll";
import { sandBoundary } from "../utils/sandGeometry";
import { optionColor } from "../utils/optionColors";

const size = 360;
const radius = 28;
const steps = 128;

// Invert the cumulative area of vertical slices. Equal parameter intervals then
// represent equal areas even when the enclosing top and bottom edges curve.
function areaCoordinates(thickness: (x: number) => number) {
  const areas = [0];
  let previous = thickness(0);
  for (let i = 1; i <= steps; i++) {
    const next = thickness(i / steps);
    areas.push(areas[i - 1] + (previous + next) / 2);
    previous = next;
  }
  return (fraction: number) => {
    const target = fraction * areas[steps];
    let low = 0, high = steps;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (areas[mid] < target) low = mid;
      else high = mid;
    }
    return (low + (target - areas[low]) / (areas[high] - areas[low])) / steps;
  };
}

function rim(x: number) {
  const distance = Math.max(0, radius - Math.min(x, size - x));
  return radius - Math.sqrt(Math.max(0, radius * radius - distance * distance));
}

const frameX = areaCoordinates(x => size - 2 * rim(x * size));

// A rounded superellipse flattens at its contacts and curves away at the corners.
function liquidPath(
  point: (u: number, v: number) => readonly [number, number],
  width: number,
  height: number,
  compression: number,
) {
  const rx = .5 - Math.min(1.2 / width, .08);
  const ry = .5 - Math.min(1.2 / height, .08);
  const exponent = .78 - compression * .14;
  const path = new Path2D();
  for (let i = 0; i < steps; i++) {
    const angle = 2 * Math.PI * i / steps;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const u = .5 + rx * Math.sign(cos) * Math.abs(cos) ** exponent;
    const v = .5 + ry * Math.sign(sin) * Math.abs(sin) ** exponent;
    const [x, y] = point(u, v);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

// The cosine has zero mean across the seam. A dent under the pointer pushes
// material out on either side while both neighbors follow the same contour.
function contact(fraction: number, along: number, across: number, at: number, strength: number) {
  const distance = (fraction - across) / .30;
  return .052 * strength * Math.exp(-distance * distance) * Math.sin(Math.PI * fraction)
    * Math.cos(2 * Math.PI * (along - at));
}

export function LiquidResults({ options, counts }: { options: PollOption[]; counts: Map<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pressure = useRef({ x: .5, y: .5, down: false });
  const impact = useRef(false);
  const animation = useRef({ phase: 0, compression: 0, velocity: 0 });
  const active = options.map((option, index) => ({ index, count: counts.get(option.id) ?? 0 })).filter(item => item.count > 0);
  const total = active.reduce((sum, item) => sum + item.count, 0);
  const weights = options.map(option => counts.get(option.id) ?? 0).join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !total) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = Math.round(size * ratio);
    if (canvas.width !== pixels || canvas.height !== pixels) canvas.width = canvas.height = pixels;
    ctx.setTransform(pixels / size, 0, 0, pixels / size, 0, 0);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, previous: number | undefined;
    let { phase, compression, velocity } = animation.current;
    // Stagger pairs so the seams meet like neighboring drops, even at a tie.
    const rows: (typeof active)[] = [];
    for (let i = 0; i < active.length;) {
      const length = active.length % 2 && i === 0 ? 1 : 2;
      rows.push(active.slice(i, i + length));
      i += length;
    }
    function draw(time: number) {
      if (!ctx) return;
      if (!motion.matches && !document.hidden) frame = requestAnimationFrame(draw);
      if (previous !== undefined && time - previous < 40) return;
      const dt = previous === undefined ? 0 : Math.min(.06, (time - previous) / 1000);
      previous = time;
      if (!motion.matches) phase = (phase + dt * .42) % (2 * Math.PI);
      const pointer = pressure.current;
      const target = pointer.down && !motion.matches ? 1 : 0;
      if (impact.current) { velocity += 3; impact.current = false; }
      // Substeps keep the damped spring stable on slower frames.
      for (let i = 0; i < 4; i++) {
        velocity += ((target - compression) * 190 - velocity * 12) * dt / 4;
        compression += velocity * dt / 4;
      }
      if (motion.matches) { compression = 0; velocity = 0; }
      ctx.clearRect(0, 0, size, size);
      let cumulative = 0;
      for (const [rowIndex, row] of rows.entries()) {
        const count = row.reduce((sum, item) => sum + item.count, 0);
        const start = cumulative / total;
        cumulative += count;
        const end = cumulative / total;
        const boundary = (fraction: number, x: number) => sandBoundary(fraction, x, -.35, phase)
          + contact(fraction, x, pointer.y, pointer.x, compression) * Math.tanh((fraction - pointer.y) * 7);
        const rowX = areaCoordinates(x => boundary(end, x) - boundary(start, x));
        const point = (u: number, v: number) => {
          const x = rowX(u);
          const px = size * frameX(x);
          const edge = rim(px);
          const y = boundary(start, x) * (1 - v) + boundary(end, x) * v;
          return [px, edge + y * (size - 2 * edge)] as const;
        };
        const split = row[0].count / count;
        const localY = (pointer.y - start) / (end - start);
        const influence = Math.exp(-4 * (localY - Math.max(0, Math.min(1, localY))) ** 2);
        const seam = (v: number) => sandBoundary(split, v, rowIndex % 2 ? .8 : -.8, phase + rowIndex + .8)
          + contact(split, v, pointer.x, localY, compression * influence) * Math.tanh((split - pointer.x) * 7);
        for (const [column, item] of row.entries()) {
          const left = (v: number) => column === 0 ? 0 : seam(v);
          const right = (v: number) => column === 0 && row.length > 1 ? seam(v) : 1;
          const center = (left(.5) + right(.5)) / 2;
          const width = point(right(.5), .5)[0] - point(left(.5), .5)[0];
          const height = point(center, 1)[1] - point(center, 0)[1];
          const path = liquidPath((u, v) => {
            const start = left(v);
            return point(start + (right(v) - start) * u, v);
          }, width, height, compression * influence);
          ctx.fillStyle = optionColor(options[item.index], item.index);
          ctx.fill(path);
          if (width > 58 && height > 49) {
            const [x, y] = point(center, .5);
            ctx.save();
            ctx.clip(path);
            ctx.fillStyle = "#411b65";
            ctx.textAlign = "center";
            ctx.font = "600 13px sans-serif";
            ctx.fillText(String.fromCharCode(65 + item.index), x, y - 4);
            ctx.font = "700 20px sans-serif";
            ctx.fillText(Math.round(item.count / total * 100) + "%", x, y + 18);
            ctx.restore();
          }
        }
      }
    }
    const restart = () => {
      cancelAnimationFrame(frame);
      previous = undefined;
      if (!document.hidden) draw(performance.now());
    };
    restart();
    motion.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    return () => {
      animation.current = { phase, compression, velocity };
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", restart);
      document.removeEventListener("visibilitychange", restart);
    };
  }, [options, weights, total]);

  const press = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pressure.current = {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      down: true,
    };
  };
  return <div className="sand-stage" style={{ borderRadius: "7.78%" }}
    onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); impact.current = true; press(event); }}
    onPointerMove={press} onLostPointerCapture={() => { pressure.current.down = false; }}>
    {total ? <canvas ref={canvasRef} role="img" aria-label={active.map(({ index, count }) => options[index].name + "：" + count + "票").join("，")} /> : <span className="sand-empty">等待第一份心意</span>}
  </div>;
}
