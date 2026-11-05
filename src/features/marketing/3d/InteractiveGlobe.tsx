"use client";
import * as React from "react";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { EARTH_POINTS } from "./earth-points";
const nodes = [[23.81, 90.41], [27.72, 85.32], [24.86, 67], [28.61, 77.21]] as const;
function project(lat: number, lon: number, angle: number, r = 136, cx = 220, cy = 160) { const phi = lat * Math.PI / 180, lambda = (lon + angle) * Math.PI / 180; return { x: cx + r * Math.cos(phi) * Math.sin(lambda), y: cy - r * Math.sin(phi), z: Math.cos(phi) * Math.cos(lambda) }; }
function landPath(angle: number) { return EARTH_POINTS.map(([lat, lon]) => { const point = project(lat, lon, angle); return point.z > 0 ? `M${point.x.toFixed(2)} ${point.y.toFixed(2)}h.01` : ""; }).join(""); }
/** No WebGL. SSR/reduced-motion/low-power fallback is the same actual dotted land as canvas. */
export function InteractiveGlobe({ className = "" }: {
    className?: string;
}) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null), rootRef = React.useRef<HTMLDivElement>(null);
    const rotation = React.useRef(-90.41);
    const velocity = React.useRef(.012);
    const [angle, setAngle] = React.useState(-90.41);
    const [paused, setPaused] = React.useState(false);
    const [ready, setReady] = React.useState(false);
    const [staticMode, setStaticMode] = React.useState(true);
    const id = React.useId().replace(/:/g, "");
    React.useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'); const connection = (navigator as Navigator & {
        connection?: {
            saveData?: boolean;
        };
    }).connection; const sync = () => setStaticMode(media.matches || navigator.hardwareConcurrency <= 4 || !!connection?.saveData); sync(); media.addEventListener('change', sync); return () => media.removeEventListener('change', sync); }, []);
    React.useEffect(() => {
        const canvas = canvasRef.current, root = rootRef.current;
        if (!canvas || !root || staticMode) {
            setReady(false);
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        let frame = 0, visible = false, last = 0, dragging = false, previousX = 0, disposed = false;
        const draw = () => {
            if (disposed)
                return;
            const size = Math.min(root.clientWidth, 520), height = 320, dpr = Math.min(devicePixelRatio || 1, 1.5);
            if (canvas.width !== Math.round(size * dpr)) {
                canvas.width = Math.round(size * dpr);
                canvas.height = Math.round(height * dpr);
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, size, height);
            const scale = Math.min(size / 440, 1);
            ctx.save();
            ctx.translate(size / 2 - 220 * scale, 160 - 160 * scale);
            ctx.scale(scale, scale);
            const style = getComputedStyle(root);
            const color = (name: string) => `rgb(${style.getPropertyValue('--ds-' + name).trim()})`;
            const ink = color('ink-solid'), teal = color('teal-500'), mint = color('mint-400');
            const ocean = ctx.createRadialGradient(180, 100, 10, 220, 160, 136);
            ocean.addColorStop(0, color('ink-700'));
            ocean.addColorStop(1, ink);
            ctx.fillStyle = ocean;
            ctx.beginPath();
            ctx.arc(220, 160, 136, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = teal;
            ctx.lineWidth = 1;
            ctx.globalAlpha = .35;
            ctx.beginPath();
            ctx.arc(220, 160, 137, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            for (const [lat, lon] of EARTH_POINTS) {
                const point = project(lat, lon, rotation.current);
                if (point.z <= 0)
                    continue;
                ctx.globalAlpha = .35 + point.z * .6;
                ctx.fillStyle = teal;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 1.15, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            const projected = nodes.map(([lat, lon]) => project(lat, lon, rotation.current));
            for (const endpoint of projected.slice(1)) {
                const start = projected[0];
                if (start.z < 0 || endpoint.z < 0)
                    continue;
                ctx.strokeStyle = mint;
                ctx.globalAlpha = .65;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.quadraticCurveTo((start.x + endpoint.x) / 2, (start.y + endpoint.y) / 2 - 28, endpoint.x, endpoint.y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            const dhaka = projected[0];
            if (dhaka.z > 0) {
                ctx.fillStyle = mint;
                ctx.beginPath();
                ctx.arc(dhaka.x, dhaka.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = color('on-ink');
                ctx.font = '12px sans-serif';
                ctx.fillText('Dhaka', dhaka.x + 8, dhaka.y + 4);
            }
            ctx.restore();
            setReady(true);
        };
        const loop = (now: number) => { frame = 0; if (!visible || document.hidden || paused)
            return; const dt = Math.min(40, last ? now - last : 16); last = now; if (!dragging) {
            velocity.current += (.012 - velocity.current) * .025;
            rotation.current += velocity.current * dt;
        } draw(); frame = requestAnimationFrame(loop); };
        const start = () => { if (!frame && visible && !document.hidden && !paused)
            frame = requestAnimationFrame(loop);
        else if (paused && visible)
            draw(); };
        const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible)
            start();
        else {
            cancelAnimationFrame(frame);
            frame = 0;
            last = 0;
        } }, { threshold: .05 });
        intersection.observe(root);
        const resize = new ResizeObserver(() => { if (visible)
            draw(); });
        resize.observe(root);
        const down = (event: PointerEvent) => { if (event.pointerType === 'touch')
            return; dragging = true; previousX = event.clientX; canvas.setPointerCapture(event.pointerId); };
        const move = (event: PointerEvent) => { if (!dragging)
            return; const delta = event.clientX - previousX; previousX = event.clientX; rotation.current += delta * .25; velocity.current = Math.max(-.15, Math.min(.15, delta * .015)); if (paused)
            draw(); };
        const up = () => { dragging = false; };
        const visibility = () => { if (document.hidden) {
            cancelAnimationFrame(frame);
            frame = 0;
        }
        else
            start(); };
        canvas.addEventListener('pointerdown', down);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        document.addEventListener('visibilitychange', visibility);
        draw();
        start();
        return () => { disposed = true; cancelAnimationFrame(frame); intersection.disconnect(); resize.disconnect(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); document.removeEventListener('visibilitychange', visibility); };
    }, [paused, staticMode, angle]);
    const rotate = (delta: number) => { rotation.current += delta; setAngle(rotation.current); };
    return <figure ref={rootRef} className={`relative w-full max-w-[520px] ${className}`}><div className="relative h-80 w-full">
   <svg viewBox="0 0 440 320" className={`absolute inset-0 h-full w-full ${ready && !staticMode ? "invisible" : ""}`} role="img" aria-label="Dotted Earth centered on Dhaka, with illustrative connections"><defs><radialGradient id={id}><stop stopColor="rgb(var(--ds-ink-700))"/><stop offset="1" stopColor="rgb(var(--ds-ink-solid))"/></radialGradient></defs><circle cx="220" cy="160" r="136" fill={`url(#${id})`} stroke="rgb(var(--ds-teal-500))" strokeOpacity=".35"/><path d={landPath(angle)} fill="none" stroke="rgb(var(--ds-teal-500))" strokeWidth="2.3" strokeLinecap="round"/>{nodes.slice(1).map(([lat, lon], index) => { const from = project(23.81, 90.41, angle), to = project(lat, lon, angle); return from.z > 0 && to.z > 0 ? <path key={index} d={`M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 28} ${to.x} ${to.y}`} fill="none" stroke="rgb(var(--ds-mint-400))" strokeOpacity=".65"/> : null; })}</svg>
   <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${ready && !staticMode ? "" : "invisible"}`} aria-hidden="true"/>
  </div><figcaption className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted"><span>Illustrative connections · not live payment activity</span><span className="flex gap-1"><button type="button" className="gp-button min-h-9 min-w-9" data-variant="ghost" aria-label="Rotate Earth left" onClick={() => rotate(-15)}><RotateCcw size={16}/></button><button type="button" className="gp-button min-h-9 min-w-9" data-variant="ghost" disabled={staticMode} aria-label={staticMode ? "Automatic rotation unavailable" : paused ? "Resume Earth rotation" : "Pause Earth rotation"} aria-pressed={paused || staticMode} onClick={() => setPaused(value => !value)}>{paused || staticMode ? <Play size={16}/> : <Pause size={16}/>}</button><button type="button" className="gp-button min-h-9 min-w-9" data-variant="ghost" aria-label="Rotate Earth right" onClick={() => rotate(15)}><RotateCw size={16}/></button></span></figcaption></figure>;
}
export default InteractiveGlobe;
