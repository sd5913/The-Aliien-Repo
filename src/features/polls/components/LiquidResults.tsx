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

// Round each cell before mapping it into the moving seams. The straight portions
// stay close together while the corners pull back into curved pockets of space.
function liquidPath(
  point: (u: number, v: number) => readonly [number, number],
  cornerX: number,
  cornerY: number,
) {
  const corners = [
    [1 - cornerX, cornerY],
    [1 - cornerX, 1 - cornerY],
    [cornerX, 1 - cornerY],
    [cornerX, cornerY],
  ];
  const path = new Path2D();
  path.moveTo(...point(cornerX, 0));
  for (const [index, [x, y]] of corners.entries()) {
    const start = (index - 1) * Math.PI / 2;
    const u = x + cornerX * Math.cos(start);
    const v = y + cornerY * Math.sin(start);
    const [previousX, previousY] = corners[(index + 3) % 4];
    // Sample the intervening side so it follows the animated seam as well.
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      path.lineTo(...point(u + (previousX - x) * (1 - t), v + (previousY - y) * (1 - t)));
    }
    for (let i = 1; cornerX > 0 && i <= 24; i++) {
      const angle = start + i * Math.PI / 48;
      path.lineTo(...point(x + cornerX * Math.cos(angle), y + cornerY * Math.sin(angle)));
    }
  }
  path.closePath();
  return path;
}

function paintBubble(ctx: CanvasRenderingContext2D, path: Path2D, color: string,
  x: number, y: number, width: number, height: number) {
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = color;
  ctx.fill(path);

  // Stretch the lighting with the cell, so thin minorities keep their hue.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width, height);
  const dome = ctx.createRadialGradient(-.27, -.30, .02, -.06, -.08, .78);
  dome.addColorStop(0, "rgba(255,255,255,.50)");
  dome.addColorStop(.45, "rgba(255,255,255,.12)");
  dome.addColorStop(.78, "rgba(55,37,81,.05)");
  dome.addColorStop(1, "rgba(55,37,81,.25)");
  ctx.fillStyle = dome;
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();

  // Nested strokes follow the actual contact contour; clipping keeps the
  // reflected light and the darker fold inside this option's allotted area.
  const film = Math.min(1, width / 65, height / 65);
  const reflection = ctx.createLinearGradient(x - width * .45, y - height * .5,
    x + width * .45, y + height * .5);
  reflection.addColorStop(0, "rgba(255,255,255,.96)");
  reflection.addColorStop(.35, "rgba(255,255,255,.4)");
  reflection.addColorStop(.58, "rgba(61,42,82,.24)");
  reflection.addColorStop(.85, "rgba(255,255,255,.78)");
  reflection.addColorStop(1, "rgba(255,255,255,.28)");
  ctx.lineJoin = "round";
  for (const [weight, stroke] of [[15, "rgba(65,45,85,.07)"],
    [9, reflection], [4, "rgba(61,44,78,.22)"], [1.6, reflection]] as const) {
    ctx.lineWidth = weight * film;
    ctx.strokeStyle = stroke;
    ctx.stroke(path);
  }
  ctx.restore();
}

export function LiquidResults({ options, counts }: { options: PollOption[]; counts: Map<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pressure = useRef(0);
  const active = options.map((option, index) => ({ index, count: counts.get(option.id) ?? 0 })).filter(item => item.count > 0);
  const total = active.reduce((sum, item) => sum + item.count, 0);
  const weights = options.map(option => counts.get(option.id) ?? 0).join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !total) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.height = size * ratio;
    ctx.scale(ratio, ratio);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, previous = -Infinity, phase = 0, tilt = 0;
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
      if (time - previous < 40) return;
      const dt = Math.min(.06, (time - previous) / 1000);
      previous = time;
      phase += motion.matches ? 0 : dt * .42;
      tilt += ((motion.matches ? 0 : pressure.current) - tilt) * .15;
      ctx.clearRect(0, 0, size, size);
      let cumulative = 0;
      for (const [rowIndex, row] of rows.entries()) {
        const count = row.reduce((sum, item) => sum + item.count, 0);
        const start = cumulative / total;
        cumulative += count;
        const end = cumulative / total;
        const boundary = (fraction: number, x: number) => sandBoundary(fraction, x, tilt * .65 - .35, phase);
        const rowX = areaCoordinates(x => boundary(end, x) - boundary(start, x));
        const point = (u: number, v: number) => {
          const x = rowX(u);
          const px = size * frameX(x);
          const edge = rim(px);
          const y = boundary(start, x) * (1 - v) + boundary(end, x) * v;
          return [px, edge + y * (size - 2 * edge)] as const;
        };
        const split = row[0].count / count;
        const seam = (v: number) => sandBoundary(split, v, (rowIndex % 2 ? .8 : -.8) + tilt * .15, phase + rowIndex + .8);
        for (const [column, item] of row.entries()) {
          const left = (v: number) => column === 0 ? 0 : seam(v);
          const right = (v: number) => column === 0 && row.length > 1 ? seam(v) : 1;
          const center = (left(.5) + right(.5)) / 2;
          const width = point(right(.5), .5)[0] - point(left(.5), .5)[0];
          const height = point(center, 1)[1] - point(center, 0)[1];
          const cellPoint = (u: number, v: number) => {
            const start = left(v);
            return point(start + (right(v) - start) * u, v);
          };
          const color = optionColor(options[item.index], item.index);
          // The liquid in each junction still belongs to the same weighted cell.
          const cell = liquidPath(cellPoint, 0, 0);
          ctx.fillStyle = color;
          ctx.fill(cell);
          ctx.fillStyle = "rgba(72,47,88,.20)";
          ctx.fill(cell);
          const bend = Math.min(width, height) * .34;
          const path = liquidPath(cellPoint, bend / width, bend / height);
          const [x, y] = point(center, .5);
          paintBubble(ctx, path, color, x, y, width, height);
          if (width > 58 && height > 49) {
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
      previous = -Infinity;
      if (!document.hidden) draw(performance.now());
    };
    restart();
    motion.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", restart);
      document.removeEventListener("visibilitychange", restart);
    };
  }, [options, weights, total]);

  const press = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pressure.current = Math.max(-1, Math.min(1, 2 * (event.clientX - rect.left) / rect.width - 1));
  };
  return <div className="sand-stage" style={{ borderRadius: "7.78%" }}
    onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); press(event); }}
    onPointerMove={press} onLostPointerCapture={() => { pressure.current = 0; }}>
    {total ? <canvas ref={canvasRef} role="img" aria-label={active.map(({ index, count }) => options[index].name + "：" + count + "票").join("，")} /> : <span className="sand-empty">等待第一份心意</span>}
  </div>;
}
