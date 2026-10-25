"use client";

import React, { useEffect, useRef, useState } from "react";

interface NodePoint {
  name: string;
  lat: number;
  lon: number;
  isPrimary?: boolean;
}

/**
 * Polished HTML5 Canvas Earth visualization.
 * Features:
 * - Prominent Bangladesh central hub (Dhaka) with radiant pulse waves.
 * - Global network arcs connecting to international crypto and data hubs (Singapore, Dubai, London, Frankfurt, Tokyo).
 * - Animated travelling photon pulses along connection arcs.
 * - Full prefers-reduced-motion support (stops rotation and particle animations).
 * - High-DPI canvas rendering and dark/light mode elegance.
 */
export function InteractiveGlobe({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

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
    if (!ctx) return;

    let animationFrameId = 0;
    let rotationAngle = 70; // Start with South Asia / Bangladesh nicely centered
    let pulsePhase = 0;

    // Network Hub Nodes
    const nodes: NodePoint[] = [
      { name: "Dhaka (Primary)", lat: 23.8103, lon: 90.4125, isPrimary: true },
      { name: "Singapore", lat: 1.3521, lon: 103.8198 },
      { name: "Dubai", lat: 25.2048, lon: 55.2708 },
      { name: "Frankfurt", lat: 50.1109, lon: 8.6821 },
      { name: "London", lat: 51.5074, lon: -0.1278 },
      { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    ];

    // Connection Arcs between Bangladesh and Global Hubs
    const arcs = [
      { from: 0, to: 1 }, // Dhaka -> Singapore
      { from: 0, to: 2 }, // Dhaka -> Dubai
      { from: 0, to: 3 }, // Dhaka -> Frankfurt
      { from: 0, to: 4 }, // Dhaka -> London
      { from: 0, to: 5 }, // Dhaka -> Tokyo
    ];

    // Particles travelling along arcs
    const particles = arcs.map((_, i) => ({
      arcIndex: i,
      progress: (i * 0.2) % 1.0,
      speed: 0.006 + (i % 3) * 0.002,
    }));

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || 480;
      const h = parent?.clientHeight || 420;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    // 3D Spherical to 2D projection
    const project = (lat: number, lon: number, rot: number, radius: number, cx: number, cy: number) => {
      const lambda = ((lon + rot) * Math.PI) / 180;
      const phi = (lat * Math.PI) / 180;
      const x = radius * Math.cos(phi) * Math.sin(lambda);
      const y = -radius * Math.sin(phi);
      const z = radius * Math.cos(phi) * Math.cos(lambda);
      return { x: cx + x, y: cy + y, z };
    };

    const render = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.38;
      const isDark = document.documentElement.classList.contains("dark");

      if (!reducedMotion) {
        rotationAngle = (rotationAngle + 0.15) % 360;
        pulsePhase = (pulsePhase + 0.04) % (Math.PI * 2);
      }

      ctx.clearRect(0, 0, w, h);

      // Outer Glow Atmosphere
      const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.25);
      glowGrad.addColorStop(0, isDark ? "rgba(20, 184, 166, 0.16)" : "rgba(13, 148, 136, 0.12)");
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Globe Base Sphere
      const sphereGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
      sphereGrad.addColorStop(0, isDark ? "#18181b" : "#fcfcfd");
      sphereGrad.addColorStop(0.7, isDark ? "#09090b" : "#f4f4f5");
      sphereGrad.addColorStop(1, isDark ? "#040405" : "#e4e4e7");

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();
      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Latitudinal Wireframe Rings
      const ringLatitudes = [-45, -20, 0, 20, 45];
      for (const lat of ringLatitudes) {
        const phi = (lat * Math.PI) / 180;
        const ringRadius = radius * Math.cos(phi);
        const ringY = cy - radius * Math.sin(phi);

        ctx.beginPath();
        ctx.ellipse(cx, ringY, Math.max(2, ringRadius), Math.max(1, ringRadius * 0.26), 0, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? "rgba(20, 184, 166, 0.14)" : "rgba(13, 148, 136, 0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Longitudinal Rings
      for (let lon = 0; lon < 360; lon += 45) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 10) {
          const pt = project(lat, lon, rotationAngle, radius, cx, cy);
          if (pt.z >= 0) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Draw Arcs & Network Pulses
      const projectedNodes = nodes.map((n) => project(n.lat, n.lon, rotationAngle, radius, cx, cy));

      arcs.forEach((arc, arcIdx) => {
        const p1 = projectedNodes[arc.from];
        const p2 = projectedNodes[arc.to];

        // Draw if at least one node is on front hemisphere
        if (p1.z >= -radius * 0.3 || p2.z >= -radius * 0.3) {
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          // Arc curvature outward from globe center
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const bend = dist * 0.28;
          const ctrlX = midX + (midX - cx) * 0.2;
          const ctrlY = midY - bend;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y);
          ctx.strokeStyle = isDark
            ? "rgba(45, 212, 191, 0.35)"
            : "rgba(15, 118, 110, 0.3)";
          ctx.lineWidth = 1.6;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated photon particle travelling along arc
          if (!reducedMotion) {
            const particle = particles[arcIdx];
            particle.progress = (particle.progress + particle.speed) % 1.0;
            const t = particle.progress;
            // Quadratic Bezier interpolation: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
            const partX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * ctrlX + t * t * p2.x;
            const partY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * ctrlY + t * t * p2.y;

            ctx.beginPath();
            ctx.arc(partX, partY, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? "#5eead4" : "#0d9488";
            ctx.shadowColor = isDark ? "#2dd4bf" : "#14b8a6";
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      // Draw Nodes
      projectedNodes.forEach((pt, i) => {
        if (pt.z >= 0) {
          const node = nodes[i];
          if (node.isPrimary) {
            // Bangladesh Primary Radiant Node
            const waveRadius = 6 + Math.sin(pulsePhase) * 5;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, waveRadius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = isDark ? "rgba(45, 212, 191, 0.4)" : "rgba(13, 148, 136, 0.4)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? "#2dd4bf" : "#0f766e";
            ctx.fill();

            // Core center
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            // Label for Bangladesh
            ctx.font = "bold 10px monospace";
            ctx.fillStyle = isDark ? "#5eead4" : "#0f766e";
            ctx.fillText("BANGLADESH (HQ)", pt.x + 9, pt.y - 7);
          } else {
            // Secondary Global Nodes
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? "#a1a1aa" : "#71717a";
            ctx.fill();

            ctx.font = "9px sans-serif";
            ctx.fillStyle = isDark ? "rgba(244, 244, 245, 0.75)" : "rgba(39, 39, 42, 0.75)";
            ctx.fillText(node.name, pt.x + 6, pt.y + 3);
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full max-w-[520px] max-h-[460px]" aria-hidden />
      <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        <span>Conceptual payment routing & verification networks</span>
      </div>
    </div>
  );
}

export default InteractiveGlobe;
