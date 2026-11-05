"use client";
import * as React from "react";
import { DialogFrame } from "./dialog-frame";
export function Modal(props:{open:boolean;onClose:()=>void;title?:string;children:React.ReactNode}) { return <DialogFrame {...props}/>; }
