"use client";
import { useState } from 'react';
import { HostedCheckoutModal } from '@/features/checkout/components/HostedCheckoutModal';
import { CheckoutSession, PaymentMethod } from '@/lib/types/api';

export default function CheckoutPreview() {
  const [session] = useState<CheckoutSession>(() => {
    const method = (code:string,name:string,crypto=false):PaymentMethod => ({code,name,country:crypto?'GLOBAL':'BD',category:crypto?'crypto':'mfs',logo:`/methods/${code}.svg`,currency:crypto?'USDT':'BDT',feePercentage:0,fixedFee:0,minAmount:1,maxAmount:100000,isEnabled:true,isAutomated:!crypto,requiresTxidInput:true,payableAmount:crypto?1.25:150,payableCurrency:crypto?'USDT':'BDT',instructions:'Preview only. Do not send money. Use a sample transaction ID to explore the test result.'});
    return {sessionId:'demo-checkout-preview',linkId:'demo',merchantName:'GressPay Demo Store',merchantVerified:false,orderTitle:'Sample order',orderDescription:'Interactive checkout preview',amount:150,currency:'BDT',availableMethods:[method('bkash','bKash'),method('nagad','Nagad'),method('binance_pay','Binance Pay',true),method('usdt_trc20','USDT TRC-20',true)],ledgerMode:'test',verificationMode:'trx_id',expiresAt:new Date(Date.now()+1800000).toISOString(),createdAt:new Date().toISOString()};
  });
  return <main className="min-h-screen bg-zinc-100 px-3 py-6 dark:bg-zinc-900 sm:py-12"><div className="mx-auto mb-5 max-w-2xl rounded-xl border border-zinc-300 bg-white p-4 text-center text-sm dark:border-zinc-700 dark:bg-zinc-950"><strong>Interactive preview — no real payment</strong><p className="mt-1 text-xs text-zinc-500">Sample merchant and methods. No live API calls or funds are involved.</p></div><HostedCheckoutModal session={session} demoMode/></main>;
}
