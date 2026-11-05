import * as React from "react";
import { Loader2 } from "lucide-react";
export interface SpinnerProps {size?:"xs"|"sm"|"md"|"lg";className?:string;label?:string;}
export function Spinner({size="md",className="",label="Loading"}:SpinnerProps){return <span className="inline-flex items-center gap-2" role="status"><Loader2 aria-hidden="true" className={`animate-spin ${{xs:"h-3 w-3",sm:"h-4 w-4",md:"h-6 w-6",lg:"h-8 w-8"}[size]} ${className}`}/><span className={label?"text-xs":"sr-only"}>{label||"Loading"}</span></span>;}
