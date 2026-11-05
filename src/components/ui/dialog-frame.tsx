"use client";
import * as React from "react";
import { X } from "lucide-react";
let locks=0; let previousOverflow="";
export function DialogFrame({open,onClose,title,description,children,footer,className="",label="Dialog"}:{open:boolean;onClose:()=>void;title?:React.ReactNode;description?:React.ReactNode;children:React.ReactNode;footer?:React.ReactNode;className?:string;label?:string}) {
  const ref=React.useRef<HTMLDialogElement>(null); const id=React.useId();
  React.useEffect(()=>{
    const dialog=ref.current; if(!dialog||!open)return;
    const previous=document.activeElement as HTMLElement|null;
    if(locks++===0){previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";}
    dialog.showModal();
    return()=>{dialog.close();if(--locks===0)document.body.style.overflow=previousOverflow;previous?.focus({preventScroll:true});};
  },[open]);
  return <dialog ref={ref} tabIndex={-1} onKeyDown={event=>{
      if(event.key==="Escape"){event.preventDefault();event.stopPropagation();onClose();return;}
      if(event.key!=="Tab")return;
      const nodes=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter(node=>node.getClientRects().length>0 && !node.closest('[inert]'));
      const first=nodes[0],last=nodes[nodes.length-1];
      if(!first){event.preventDefault();event.currentTarget.focus();}
      else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }} className={`gp-dialog w-[calc(100%_-_32px)] max-w-lg ${className}`} aria-labelledby={title?id:undefined} aria-label={title?undefined:label} aria-describedby={description?`${id}-description`:undefined} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target!==event.currentTarget)return;const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)onClose();}}>
    <div className="mb-5 flex items-start justify-between gap-4"><div>{title&&<h2 id={id} className="text-xl font-semibold tracking-tight">{title}</h2>}{description&&<p id={`${id}-description`} className="mt-1 text-sm text-muted">{description}</p>}</div><button type="button" className="gp-button min-h-10 min-w-10 shrink-0" data-variant="ghost" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>
    {children}{footer&&<div className="mt-6 border-t border-border pt-4">{footer}</div>}
  </dialog>;
}
