import { useEffect, useRef } from "react";
import type { PollOption } from "../../../types/poll";
import { optionColor } from "../utils/optionColors";
import { chartSize, pressPoint, resultShapes } from "../utils/resultShapes";
import type { Contact, Point } from "../utils/resultShapes";

export function LiquidResults({ pollId, options, counts }: { pollId: string; options: PollOption[]; counts: Map<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const votes = options.map(option => counts.get(option.id) ?? 0);
  const total = votes.reduce((sum, count) => sum + count, 0);
  const weights = votes.join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !total) return;
    const pixels = Math.round(chartSize * Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = canvas.height = pixels;
    const ratio = pixels / chartSize;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const shapes = resultShapes(pollId, votes);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let paths: { path: Path2D; center: Point; points: Point[] }[] = [];
    let contact: Contact | undefined;
    let pointerId: number | undefined;
    let strength = 0, holdUntil = 0, frame = 0, previous = 0;

    const draw = (time: number) => {
      cancelAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(60, Math.max(0, time - previous));
      previous = time;
      const target = pointerId !== undefined || time < holdUntil ? 1 : 0;
      strength = motion.matches ? target : target + (strength - target) * Math.exp(-dt / (target ? 65 : 105));
      if (!target && strength < .005) { strength = 0; contact = undefined; }
      ctx.clearRect(0, 0, chartSize, chartSize);
      paths = shapes.map(shape => {
        // Subpixel drift translates each outline without changing its area.
        const dx = motion.matches ? 0 : Math.min(.55, shape.width * .003) * Math.sin(time / 5300 + shape.phase);
        const dy = motion.matches ? 0 : Math.min(.45, shape.height * .003) * Math.cos(time / 6100 + shape.phase);
        const project = (p: Point) => {
          const rest = { x: p.x + dx, y: p.y + dy };
          return contact ? pressPoint(rest, contact, strength) : rest;
        };
        const points = shape.points.map(project);
        const path = new Path2D();
        path.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
        path.closePath();
        ctx.fillStyle = optionColor(options[shape.index], shape.index);
        ctx.fill(path);
        const center = project(shape.center);
        if (shape.main && shape.width > 58 && shape.height > 49) {
          ctx.save();
          ctx.clip(path);
          ctx.fillStyle = "#411b65";
          ctx.textAlign = "center";
          ctx.font = "600 13px sans-serif";
          ctx.fillText(String.fromCharCode(65 + shape.index), center.x, center.y - 4);
          ctx.font = "700 20px sans-serif";
          ctx.fillText(Math.round(votes[shape.index] / total * 100) + "%", center.x, center.y + 18);
          ctx.restore();
        }
        return { path, center, points };
      });
      if (!motion.matches || time < holdUntil) frame = requestAnimationFrame(draw);
    };

    const press = (event: PointerEvent) => {
      if (pointerId !== undefined || event.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const focus = {
        x: (event.clientX - rect.left) / rect.width * chartSize,
        y: (event.clientY - rect.top) / rect.height * chartSize,
      };
      const hit = paths.find(({ path }) => ctx.isPointInPath(path, focus.x * ratio, focus.y * ratio));
      const nearestEdge = hit ? Math.min(...hit.points.map(p => Math.hypot(p.x - focus.x, p.y - focus.y))) : 0;
      contact = { focus, origin: hit?.center ?? focus, radius: 78 + nearestEdge * 1.35 };
      pointerId = event.pointerId;
      canvas.setPointerCapture(pointerId);
      const now = performance.now();
      holdUntil = now + 110;
      strength = .35;
      draw(now);
    };
    const release = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = undefined;
      if (event.type === "pointercancel") holdUntil = 0;
      draw(performance.now());
    };
    const restart = () => draw(performance.now());
    restart();
    canvas.addEventListener("pointerdown", press);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("lostpointercapture", release);
    motion.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", press);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
      canvas.removeEventListener("lostpointercapture", release);
      motion.removeEventListener("change", restart);
      document.removeEventListener("visibilitychange", restart);
    };
  }, [options, weights, total, pollId]);

  return <div className="sand-stage" style={{ borderRadius: "7.78%" }}>
    {total ? <canvas ref={canvasRef} role="img" aria-label={options.flatMap((option, index) =>
      votes[index] ? [option.name + "：" + votes[index] + "票"] : []).join("，")} /> : <span className="sand-empty">等待第一份心意</span>}
  </div>;
}
