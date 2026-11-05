"use client";
import * as React from "react";
/** Showcase-only depth. No animation loop while resting; touch/reduced motion stay flat. */
export function Tilt3D({children,className="",maxTilt=6}:{children:React.ReactNode;className?:string;maxTilt?:number}){
 const ref=React.useRef<HTMLDivElement>(null);
 React.useEffect(()=>{const node=ref.current;if(!node)return;const media=matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse), (hover: none)');let frame=0;let x=0,y=0,vx=0,vy=0,tx=0,ty=0;const limit=Math.min(6,Math.max(0,maxTilt));
 const tick=()=>{vx=(vx+(tx-x)*.12)*.68;vy=(vy+(ty-y)*.12)*.68;x+=vx;y+=vy;node.style.transform=`perspective(1200px) rotateX(${Math.max(-8,Math.min(8,x))}deg) rotateY(${Math.max(-8,Math.min(8,y))}deg)`;if(Math.abs(x-tx)+Math.abs(y-ty)+Math.abs(vx)+Math.abs(vy)>.01)frame=requestAnimationFrame(tick);else frame=0;};
 const start=()=>{if(!frame&&!media.matches)frame=requestAnimationFrame(tick);};
 const move=(event:PointerEvent)=>{if(media.matches||event.pointerType==='touch')return;const box=node.getBoundingClientRect();tx=(.5-(event.clientY-box.top)/box.height)*2*limit;ty=((event.clientX-box.left)/box.width-.5)*2*limit;start();};
 const leave=()=>{tx=ty=0;start();};const change=()=>{node.dataset.enabled=String(!media.matches);if(media.matches){cancelAnimationFrame(frame);frame=0;x=y=vx=vy=tx=ty=0;node.style.transform='none';}};
 change();node.addEventListener('pointermove',move);node.addEventListener('pointerleave',leave);media.addEventListener('change',change);
 return()=>{cancelAnimationFrame(frame);node.removeEventListener('pointermove',move);node.removeEventListener('pointerleave',leave);media.removeEventListener('change',change);node.style.transform='none';};},[maxTilt]);
 return <div ref={ref} className={`gp-tilt ${className}`} data-showcase="true" data-enabled="false">{children}</div>;
}
