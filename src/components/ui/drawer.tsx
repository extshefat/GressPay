"use client";
import * as React from "react";
import { DialogFrame } from "./dialog-frame";
export interface DrawerProps {open:boolean;onClose:()=>void;title?:React.ReactNode;description?:React.ReactNode;children:React.ReactNode;footer?:React.ReactNode;position?:"right"|"left";size?:"sm"|"md"|"lg"|"xl";className?:string;}
export function Drawer({position="right",size="md",className="",...props}:DrawerProps){const sizes={sm:"max-w-md",md:"max-w-lg",lg:"max-w-2xl",xl:"max-w-4xl"};return <DialogFrame {...props} className={`!fixed !inset-y-0 !my-0 !h-dvh !max-h-dvh !w-full ${position==="right"?"!ml-auto !mr-0 !rounded-r-none":"!mr-auto !ml-0 !rounded-l-none"} ${sizes[size]} ${className}`}/>;}
