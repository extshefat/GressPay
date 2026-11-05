import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { DesignSystemShowcase } from "./showcase";
export const metadata:Metadata={title:"GressPay design system",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function DesignSystemPage(){
 if(process.env.NODE_ENV!=="development"){
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!token)notFound();
  let allowed=false;
  try{const response=await fetch(`${process.env.GRESSPAY_PHP_URL||"http://php:8080"}/api/v1/me`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(3000)});if(response.ok){const {user}=await response.json();allowed=user?.emailVerified===true&&(user?.role==="admin"||user?.isAdmin===true||user?.is_admin===true);}}catch{/* Fail closed if authentication cannot be verified. */}
  if(!allowed)notFound();
 }
 return <DesignSystemShowcase/>;
}
