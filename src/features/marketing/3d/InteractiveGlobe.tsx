"use client";

import React, { useEffect, useRef, useState } from "react";

interface NodePoint {
  name: string;
  lat: number;
  lon: number;
  isPrimary?: boolean;
}

/**
 * Canvas Earth. Land comes from public/brand/earth-land.png (Natural Earth, public domain).
 * Arcs are illustrative coordinates, not live payments.
 */
export function InteractiveGlobe({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [canvasReady, setCanvasReady] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCanvasReady(false);
      return;
    }

    let animationFrameId = 0;
    let visible = true;
    let rotationAngle = -90.41;
    let pulsePhase = 0;
    let land: ImageData | null = null;

    const nodes: NodePoint[] = [
      { name: "Dhaka", lat: 23.8103, lon: 90.4125, isPrimary: true },
      { name: "Singapore", lat: 1.3521, lon: 103.8198 },
      { name: "Dubai", lat: 25.2048, lon: 55.2708 },
      { name: "London", lat: 51.5074, lon: -0.1278 },
    ];
    const arcs = [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 0, to: 3 },
    ];
    const particles = arcs.map((_, i) => ({
      progress: (i * 0.28) % 1,
      speed: 0.004 + i * 0.001,
    }));

    const mask = new Image();
    mask.src = "/brand/earth-land.png";
    mask.onload = () => {
      const scratch = document.createElement("canvas");
      scratch.width = mask.naturalWidth;
      scratch.height = mask.naturalHeight;
      const sctx = scratch.getContext("2d");
      if (!sctx) return;
      sctx.drawImage(mask, 0, 0);
      land = sctx.getImageData(0, 0, scratch.width, scratch.height);
      drawFrame();
    };

    const isLand = (lat: number, lon: number) => {
      if (!land) return false;
      const wrapped = ((lon + 180) % 360 + 360) % 360;
      const x = Math.min(land.width - 1, Math.max(0, Math.floor((wrapped / 360) * land.width)));
      const y = Math.min(land.height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * land.height)));
      return land.data[(y * land.width + x) * 4] > 128;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || 480;
      const h = parent?.clientHeight || 420;
      const mobile = w < 640;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const project = (lat: number, lon: number, rot: number, radius: number, cx: number, cy: number) => {
      const lambda = ((lon + rot) * Math.PI) / 180;
      const phi = (lat * Math.PI) / 180;
      const x = radius * Math.cos(phi) * Math.sin(lambda);
      const y = -radius * Math.sin(phi);
      const z = radius * Math.cos(phi) * Math.cos(lambda);
      return { x: cx + x, y: cy + y, z };
    };

    const drawFrame = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.38;
      const isDark = document.documentElement.classList.contains("dark");

      ctx.clearRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.22);
      glow.addColorStop(0, isDark ? "rgba(45, 212, 191, 0.22)" : "rgba(15, 118, 110, 0.16)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.22, 0, Math.PI * 2);
      ctx.fill();

      const ocean = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.35, radius * 0.15, cx, cy, radius);
      ocean.addColorStop(0, isDark ? "#1e3a4c" : "#d7ebe8");
      ocean.addColorStop(0.72, isDark ? "#0c1c28" : "#b7d4cf");
      ocean.addColorStop(1, isDark ? "#071018" : "#8fb8b2");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = ocean;
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const pixel = radius < 150 ? 3 : 2;
      const landColor = isDark ? "#4d8a68" : "#1f6b4a";
      ctx.fillStyle = landColor;
      for (let sy = -radius; sy <= radius; sy += pixel) {
        const rowWidth = Math.sqrt(Math.max(0, radius * radius - sy * sy));
        for (let sx = -rowWidth; sx <= rowWidth; sx += pixel) {
          const sz = Math.sqrt(Math.max(0, radius * radius - sx * sx - sy * sy));
          const phi = Math.asin(Math.max(-1, Math.min(1, -sy / radius)));
          const lambda = Math.atan2(sx, sz);
          const lat = (phi * 180) / Math.PI;
          const lon = (lambda * 180) / Math.PI - rotationAngle;
          if (!isLand(lat, lon)) continue;
          const light = 0.62 + (sz / radius) * 0.38;
          ctx.globalAlpha = light;
          ctx.fillRect(cx + sx, cy + sy, pixel, pixel);
        }
      }
      ctx.globalAlpha = 1;

      const shade = ctx.createRadialGradient(cx - radius * 0.4, cy - radius * 0.45, radius * 0.1, cx, cy, radius);
      shade.addColorStop(0, "rgba(255,255,255,0.16)");
      shade.addColorStop(0.55, "rgba(255,255,255,0)");
      shade.addColorStop(1, isDark ? "rgba(0,0,0,0.45)" : "rgba(0,30,28,0.22)");
      ctx.fillStyle = shade;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? "rgba(153, 246, 228, 0.35)" : "rgba(15, 118, 110, 0.35)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      const projected = nodes.map((n) => project(n.lat, n.lon, rotationAngle, radius, cx, cy));
      arcs.forEach((arc, arcIdx) => {
        const p1 = projected[arc.from];
        const p2 = projected[arc.to];
        if (p1.z < -radius * 0.15 && p2.z < -radius * 0.15) return;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const ctrlX = midX + (midX - cx) * 0.15;
        const ctrlY = midY - dist * 0.22;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y);
        ctx.strokeStyle = isDark ? "rgba(94, 234, 212, 0.7)" : "rgba(15, 118, 110, 0.7)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        if (!reducedMotion) {
          const particle = particles[arcIdx];
          particle.progress = (particle.progress + particle.speed) % 1;
          const t = particle.progress;
          const partX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * ctrlX + t * t * p2.x;
          const partY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * ctrlY + t * t * p2.y;
          ctx.beginPath();
          ctx.arc(partX, partY, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "#99f6e4" : "#0f766e";
          ctx.fill();
        }
      });

      projected.forEach((pt, i) => {
        if (pt.z < 0) return;
        const node = nodes[i];
        if (node.isPrimary) {
          const wave = reducedMotion ? 8 : 6 + Math.sin(pulsePhase) * 4;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, wave + 3, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? "rgba(153, 246, 228, 0.7)" : "rgba(15, 118, 110, 0.65)";
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = "#0f766e";
          ctx.fill();
          ctx.font = "bold 11px ui-sans-serif, system-ui, sans-serif";
          ctx.fillStyle = isDark ? "#ccfbf1" : "#134e4a";
          ctx.fillText("Dhaka", pt.x + 8, pt.y - 6);
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "#e4e4e7" : "#3f3f46";
          ctx.fill();
          ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
          ctx.fillStyle = isDark ? "rgba(244,244,245,0.86)" : "rgba(24,24,27,0.8)";
          ctx.fillText(node.name, pt.x + 6, pt.y + 3);
        }
      });
    };

    const loop = () => {
      if (!visible) {
        animationFrameId = 0;
        return;
      }
      if (!reducedMotion) {
        rotationAngle = (rotationAngle + 0.12) % 360;
        pulsePhase = (pulsePhase + 0.04) % (Math.PI * 2);
      }
      drawFrame();
      animationFrameId = reducedMotion ? 0 : requestAnimationFrame(loop);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !animationFrameId) loop();
        if (!visible && animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = 0;
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);
    const themeObserver = new MutationObserver(() => {
      if (reducedMotion) drawFrame();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    loop();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion]);

  return (
    <div className={`relative flex h-[420px] w-full max-w-[520px] flex-col items-center justify-center ${className}`}>
      {canvasReady ? (
        <canvas ref={canvasRef} className="h-full w-full" role="img" aria-label="Illustrated Earth centered on Dhaka" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/earth-land.png"
          alt="Equirectangular land map used when canvas is unavailable"
          className="h-64 w-64 rounded-full object-cover"
        />
      )}
      <p className="mt-2 text-center text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
        Illustrative payment routes. Not live transaction data.
      </p>
    </div>
  );
}

export default InteractiveGlobe;
