import { useEffect, useRef } from "react";
import type { PollOption } from "../../../types/poll";
import { optionColor } from "../utils/optionColors";
import { chartSize, dragPoint, jellyPose, pressPoint, resultShapes } from "../utils/resultShapes";
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
    let holdTimer: number | undefined;
    let drag: { box: typeof shapes[number]["box"]; start: Point; delta: Point; releasing: boolean } | undefined;
    let strength = 0, velocity = 0, holdUntil = 0, frame = 0, previous = 0;

    const draw = (time: number) => {
      cancelAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(60, Math.max(0, time - previous));
      previous = time;
      if (drag?.releasing) {
        const decay = motion.matches ? 0 : Math.exp(-dt / 95);
        drag.delta = { x: drag.delta.x * decay, y: drag.delta.y * decay };
        if (Math.hypot(drag.delta.x, drag.delta.y) < .1) drag = undefined;
      }
      const target = pointerId !== undefined || time < holdUntil ? 1 : 0;
      if (motion.matches) {
        strength = target;
        velocity = 0;
      } else if (contact) {
        const step = dt / 8000;
        for (let i = 0; i < 8; i++) {
          velocity += ((target - strength) * 340 - velocity * 13) * step;
          strength += velocity * step;
        }
      }
      if (!target && Math.abs(strength) < .005 && Math.abs(velocity) < .05) {
        strength = velocity = 0;
        contact = undefined;
      }
      ctx.clearRect(0, 0, chartSize, chartSize);
      paths = shapes.map(shape => {
        const pose = motion.matches ? { scaleX: 1, scaleY: 1, dy: 0 } : jellyPose(time, shape.phase, shape.height);
        const project = (p: Point) => {
          const rest = {
            x: shape.center.x + (p.x - shape.center.x) * pose.scaleX,
            y: shape.center.y + (p.y - shape.center.y) * pose.scaleY + pose.dy,
          };
          if (drag) return dragPoint(rest, drag.box, drag.delta);
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
        if (shape.width > 58 && shape.height > 49) {
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

    const position = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / rect.width * chartSize,
        y: (event.clientY - rect.top) / rect.height * chartSize,
      };
    };
    const press = (event: PointerEvent) => {
      if (pointerId !== undefined || event.button !== 0) return;
      const focus = position(event);
      const index = paths.findIndex(({ path }) => ctx.isPointInPath(path, focus.x * ratio, focus.y * ratio));
      const hit = paths[index];
      const nearestEdge = hit ? Math.min(...hit.points.map(p => Math.hypot(p.x - focus.x, p.y - focus.y))) : 0;
      contact = { focus, origin: hit?.center ?? focus, radius: 78 + nearestEdge * 1.35 };
      pointerId = event.pointerId;
      if (hit) holdTimer = window.setTimeout(() => {
        holdTimer = undefined;
        drag = { box: shapes[index].box, start: focus, delta: { x: 0, y: 0 }, releasing: false };
        contact = undefined;
        draw(performance.now());
      }, 350);
      canvas.setPointerCapture(pointerId);
      const now = performance.now();
      holdUntil = now + 110;
      strength = .35;
      velocity = 0;
      draw(now);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const p = position(event);
      if (drag && !drag.releasing) {
        const clamp = (n: number) => Math.max(0, Math.min(chartSize, n));
        drag.delta = { x: clamp(p.x) - drag.start.x, y: clamp(p.y) - drag.start.y };
        draw(performance.now());
      } else if (contact && Math.hypot(p.x - contact.focus.x, p.y - contact.focus.y) > 9) {
        window.clearTimeout(holdTimer);
      }
    };
    const release = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = undefined;
      window.clearTimeout(holdTimer);
      if (drag) drag.releasing = true;
      if (event.type === "pointercancel") holdUntil = 0;
      draw(performance.now());
    };
    const restart = () => draw(performance.now());
    const preventMenu = (event: Event) => event.preventDefault();
    restart();
    canvas.addEventListener("pointerdown", press);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("contextmenu", preventMenu);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("lostpointercapture", release);
    motion.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(holdTimer);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("contextmenu", preventMenu);
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
