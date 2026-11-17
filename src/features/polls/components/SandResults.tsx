import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { PollOption } from "../../../types/poll";
import { sandBoundary, sandColors } from "../utils/sandGeometry";

type MotionStatus = "off" | "waiting" | "on";
type OrientationPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const grains = Array.from({ length: 1600 }, (_, index) => ({
  x: ((index * 73.137) % 360),
  y: ((index * 137.519) % 360),
  size: .25 + (index % 5) * .13,
}));

export function SandResults({ options, counts }: { options: PollOption[]; counts: Map<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilt = useRef({ target: 0, current: 0 });
  const [motion, setMotion] = useState<MotionStatus>("off");
  const [feedback, setFeedback] = useState("");
  const mounted = useRef(true);
  const validTotal = options.reduce((sum, option) => sum + (counts.get(option.id) ?? 0), 0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (motion === "off") return;
    let received = false;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;
      const angle = (window.screen.orientation?.angle ?? 0) * Math.PI / 180;
      tilt.current.target = Math.max(-1, Math.min(1,
        (event.gamma * Math.cos(angle) + event.beta * Math.sin(angle)) / 45,
      ));
      if (!received) { received = true; setMotion("on"); }
    };
    window.addEventListener("deviceorientation", handleOrientation);
    const timeout = window.setTimeout(() => {
      if (!received) {
        setMotion("off");
        setFeedback("未收到重力数据，可以拖动流沙体验");
      }
    }, 4000);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.clearTimeout(timeout);
      tilt.current.target = 0;
    };
  }, [motion]);

  const toggleMotion = async () => {
    if (motion !== "off") { setMotion("off"); setFeedback(""); return; }
    if (!window.isSecureContext || typeof DeviceOrientationEvent === "undefined") {
      setFeedback("当前环境无法开启重力感应，可以拖动流沙体验");
      return;
    }
    try {
      const orientation = DeviceOrientationEvent as OrientationPermission;
      if (orientation.requestPermission && await orientation.requestPermission() !== "granted") {
        setFeedback("未开启重力权限，可以拖动流沙体验");
        return;
      }
      if (mounted.current) { setFeedback(""); setMotion("waiting"); }
    } catch {
      if (mounted.current) setFeedback("重力感应暂不可用，可以拖动流沙体验");
    }
  };

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
      ctx.fillStyle = "#eee5fa";
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
        const sheen = ctx.createLinearGradient(0, 0, 330, 360);
        sheen.addColorStop(0, "#ffffff55");
        sheen.addColorStop(.4, "#fff1b510");
        sheen.addColorStop(.72, "#d495482e");
        sheen.addColorStop(1, "#ffedb566");
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, 360, 360);
        for (let grain = 0; grain < grains.length; grain++) {
          const particle = grains[grain];
          const x = ((particle.x + drift * gravity * (1 + grain % 3)) % 360 + 360) % 360;
          const y = (particle.y + drift * (.3 + grain % 4 * .15)) % 360;
          ctx.fillStyle = grain % 3 ? "#ffedac66" : "#fffbe9ad";
          ctx.fillRect(x, y, particle.size, particle.size);
        }
        ctx.strokeStyle = "#fff0d83d";
        ctx.lineWidth = 9;
        ctx.stroke(path);
        ctx.restore();
        if (end - start < .075) return;
        const x = index % 2 ? 225 : 135;
        const y = boundary((start + end) / 2, x);
        const radius = Math.min(45, 18 + (end - start) * 42);
        const glass = ctx.createRadialGradient(x - radius / 3, y - radius / 2, 0, x, y, radius);
        glass.addColorStop(0, "#ffffff99");
        glass.addColorStop(.75, "#ffffff36");
        glass.addColorStop(1, "#ffffffb3");
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
        ctx.font = "600 16px sans-serif";
        ctx.fillText(String.fromCharCode(65 + index), x, y - 5);
        ctx.font = "700 23px sans-serif";
        ctx.fillText(`${Math.round(count / validTotal * 100)}%`, x, y + 22);
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
      <div className="sand-controls"><span>轻拖流沙 · 看心意流动</span><button aria-pressed={motion !== "off"} onClick={() => void toggleMotion()}>{motion === "on" ? "关闭重力" : motion === "waiting" ? "等待感应 · 取消" : "开启重力"}</button></div>
      <p className="sand-feedback" role="status">{feedback || (motion === "on" ? "轻轻倾斜手机，流沙随之流动" : "")}</p>
    </div>
  );
}
