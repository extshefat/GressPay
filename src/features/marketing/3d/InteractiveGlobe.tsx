"use client";

import React, { useEffect, useRef } from "react";

/** Lightweight canvas globe — atmosphere for the marketing hero (not a live map feed). */
export function InteractiveGlobe({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || 640;
      const h = parent?.clientHeight || 480;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const hubs = [
      { lat: 23.8, lon: 90.4 }, // Dhaka
      { lat: 28.6, lon: 77.2 }, // Delhi
      { lat: 24.9, lon: 67.0 }, // Karachi
      { lat: 27.7, lon: 85.3 }, // Kathmandu
      { lat: 1.3, lon: 103.8 }, // Singapore
    ];

    const project = (lat: number, lon: number, rot: number, R: number, cx: number, cy: number) => {
      const lam = ((lon + rot) * Math.PI) / 180;
      const phi = (lat * Math.PI) / 180;
      const x = R * Math.cos(phi) * Math.sin(lam);
      const y = -R * Math.sin(phi);
      const z = R * Math.cos(phi) * Math.cos(lam);
      return { x: cx + x, y: cy + y, z };
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.36;
      t += 0.004;
      const dark = document.documentElement.classList.contains("dark");

      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = dark ? "#18181b" : "#f4f4f5";
      ctx.fill();
      ctx.strokeStyle = dark ? "#3f3f46" : "#d4d4d8";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // latitude rings
      for (let i = -2; i <= 2; i++) {
        const phi = (i * 18 * Math.PI) / 180;
        const ry = R * Math.cos(phi);
        const yy = cy - R * Math.sin(phi);
        ctx.beginPath();
        ctx.ellipse(cx, yy, Math.max(2, ry), Math.max(1, ry * 0.22), 0, 0, Math.PI * 2);
        ctx.strokeStyle = dark ? "rgba(45,212,191,0.15)" : "rgba(15,118,110,0.15)";
        ctx.stroke();
      }

      const rot = (t * 40) % 360;
      hubs.forEach((hub, idx) => {
        const p = project(hub.lat, hub.lon, rot, R, cx, cy);
        if (p.z < 0) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = dark ? "#2dd4bf" : "#0f766e";
        ctx.fill();
        // arc to next hub
        const next = hubs[(idx + 1) % hubs.length];
        const q = project(next.lat, next.lon, rot, R, cx, cy);
        if (q.z < 0) return;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo(cx, cy - R * 0.2, q.x, q.y);
        ctx.strokeStyle = dark ? "rgba(45,212,191,0.35)" : "rgba(15,118,110,0.3)";
        ctx.stroke();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={`w-full h-full ${className}`} aria-hidden />;
}

export default InteractiveGlobe;
