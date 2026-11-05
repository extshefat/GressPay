import type { Currency, TransactionStatus } from "./types/api";
export interface NumberFormatOptions {bengaliDigits?:boolean;minimumFractionDigits?:number;maximumFractionDigits?:number;}
export function formatNumber(value:number|string,options:NumberFormatOptions={}):string {
 const amount=typeof value==="string"?Number(value):value;
 if(value===""||!Number.isFinite(amount))return "—";
 return new Intl.NumberFormat(options.bengaliDigits?"bn-BD":"en-US",{minimumFractionDigits:options.minimumFractionDigits??0,maximumFractionDigits:options.maximumFractionDigits??2}).format(amount);
}
export function formatCurrency(amount:number|string,currency:Currency,options:NumberFormatOptions={}):string {
 if(amount===""||!Number.isFinite(Number(amount)))return "—";
 const symbols:Record<Currency,string>={BDT:"৳",INR:"₹",PKR:"₨",NPR:"रू",USD:"$",USDT:"₮"};
 return `${symbols[currency]||currency}${formatNumber(amount,{minimumFractionDigits:2,maximumFractionDigits:currency==="USDT"||currency==="USD"?4:2,...options})}`;
}
export function truncateAddress(address:string,startChars=6,endChars=4):string {if(!address)return "";return address.length<=startChars+endChars?address:`${address.slice(0,startChars)}…${address.slice(-endChars)}`;}
export interface DateFormatOptions {bengaliDigits?:boolean;timeZone?:string;dateOnly?:boolean;}
export function formatDate(value:string|Date,options:DateFormatOptions={}):string {
 const date=value instanceof Date?value:new Date(value);
 if(!Number.isFinite(date.getTime()))return "—";
 return new Intl.DateTimeFormat(options.bengaliDigits?"bn-BD":"en-GB",{timeZone:options.timeZone||"Asia/Dhaka",day:"numeric",month:"short",year:"numeric",...(options.dateOnly?{}:{hour:"2-digit",minute:"2-digit"})}).format(date);
}
export function getStatusColor(status:TransactionStatus):{bg:string;text:string;border:string;glow:string}{
 switch(status){
 case "COMPLETED":return {bg:"bg-success/10",text:"text-success",border:"border-success/30",glow:""};
 case "PENDING":return {bg:"bg-warning/10",text:"text-warning",border:"border-warning/30",glow:""};
 case "FAILED":case "EXPIRED":return {bg:"bg-danger/10",text:"text-danger",border:"border-danger/30",glow:""};
 case "REFUNDED":return {bg:"bg-info/10",text:"text-info",border:"border-info/30",glow:""};
 default:return {bg:"bg-surface-muted",text:"text-muted",border:"border-border",glow:""};
 }
}
