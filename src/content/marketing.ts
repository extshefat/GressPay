/** Typed marketing copy. Bangla locale can plug in later — no switcher in Phase 4. */
export const site = {
  name: "GressPay",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://gresspay.extxcheats.com",
  tagline: "Collect bKash, Nagad, Rocket, Upay and USDT straight into your own wallets.",
  description:
    "GressPay verifies Bangladesh MFS payments with an Android companion that reads payment SMS, plus Binance Pay and USDT TRC-20. We never hold your money.",
  contactEmail: "support@gresspay.extxcheats.com",
} as const;

export const nav = {
  links: [
    { href: "/services", label: "Services" },
    { href: "/fees", label: "Pricing" },
    { href: "/developers", label: "Developers" },
    { href: "/download", label: "Download" },
    { href: "/help", label: "Help" },
  ],
  primaryCta: { href: "/register", label: "Start free" },
  secondaryCta: { href: "/login", label: "Log in" },
} as const;

export const hero = {
  eyebrow: "Payment verification for Bangladesh merchants",
  headline: "Collect bKash, Nagad and USDT into your own wallets.",
  subline:
    "GressPay never holds your money. Customers pay your published wallet; the Android companion reads payment SMS; the server matches amount and TrxID before your store gets a signed webhook. OTP and promo SMS are rejected and never uploaded.",
  primary: { href: "/register", label: "Create merchant account" },
  secondary: { href: "/developers", label: "Read the API docs" },
  trust: ["Non-custodial", "Server-side match only", "HMAC webhooks"],
  heroNote: "Illustrative checkout · no real payment",
} as const;

export const rails = [
  { code: "bkash", name: "bKash", verify: "Companion SMS match on amount + TrxID" },
  { code: "nagad", name: "Nagad", verify: "Companion SMS match on amount + TrxID" },
  { code: "rocket", name: "Rocket", verify: "Companion SMS match on amount + TrxID" },
  { code: "upay", name: "Upay", verify: "Companion SMS match on amount + TrxID" },
  { code: "cellfin", name: "Cellfin", verify: "Companion SMS match on amount + TrxID" },
  { code: "binance_pay", name: "Binance Pay", verify: "Official merchant order verification" },
  { code: "bybit_pay", name: "Bybit Pay", verify: "Provider order verification" },
  { code: "usdt_trc20", name: "USDT TRC-20", verify: "On-chain confirmations via TronGrid" },
] as const;

export const howItWorks = {
  eyebrow: "How it works",
  title: "Three steps from wallet to webhook",
  subtitle: "No aggregator settlement delay. Evidence first, then your store updates.",
  steps: [
    {
      id: "wallet",
      title: "Add your receiving wallets",
      body: "Publish the bKash, Nagad, Rocket, Upay or Cellfin numbers — and optional USDT or Binance destinations — that customers pay. Credentials stay sealed with AES-256-GCM.",
    },
    {
      id: "pay",
      title: "Customer pays and submits TrxID",
      body: "Hosted checkout shows your brand, exact amount and tap-to-copy wallet. The buyer pays in the provider app, then pastes the TrxID (or waits for SMS auto-match when enabled).",
    },
    {
      id: "match",
      title: "Server matches SMS and fires the webhook",
      body: "The companion sends only parsed fields (amount, TrxID, sender, wallet). OTP and promo texts are filtered out. When the server matches, one HMAC-signed webhook reaches your backend.",
    },
  ],
} as const;

export const walkthrough = {
  eyebrow: "Interactive sample",
  title: "From customer payment to a trusted store event",
  body: "This walkthrough is illustrative. Orders are never marked paid from a button click alone — the server waits for SMS or provider evidence.",
  stages: [
    { label: "Checkout", title: "Customer selects a wallet", body: "Brand, amount and receiving rail stay in one focused payment screen." },
    { label: "Receipt", title: "The paired phone sees the receipt", body: "The companion listens only for configured payment senders and uploads structured fields — never the raw SMS body." },
    { label: "Verify", title: "The server matches the evidence", body: "Wallet, exact amount, TrxID and checkout window must agree before status can change." },
    { label: "Confirm", title: "Your store receives confirmation", body: "GressPay records the settlement once and delivers a signed webhook to your integration." },
  ],
} as const;

export const companion = {
  eyebrow: "Android companion",
  title: "The phone that watches your payment SIM",
  body: "Install the APK on the device holding your receiving SIMs. Pair with a device key, bind a gateway, and keep the app online. Payment SMS are parsed on-device; OTP and promo messages are discarded.",
  placeholderNote: "Phone UI below is a Phase 4 React replica of the companion screens. Pixel-perfect Android redesign ships in Phase 6.",
  screens: [
    { id: "pair", title: "Pair device", caption: "Paste gpdev_ key once" },
    { id: "bind", title: "Bind wallet", caption: "Active gateway only" },
    { id: "sms", title: "SMS feed", caption: "Parsed fields only" },
  ],
} as const;

export const coverage = {
  eyebrow: "Coverage",
  title: "Bangladesh first. Crypto where you need it.",
  body: "Local MFS rails are live today. Globe arcs are illustrative — they do not show live traffic.",
  regions: [
    { name: "Bangladesh", detail: "bKash, Nagad, Rocket, Upay, Cellfin" },
    { name: "Crypto", detail: "USDT TRC-20, Binance Pay, Bybit Pay" },
  ],
} as const;

export const rates = {
  eyebrow: "Estimate",
  title: "Convert BDT, USD and USDT",
  body: "Uses the same live rates endpoint as checkout. This is an estimate — gateway and brand fees on your methods apply at payment time.",
  disclaimer: "Estimate only. Final payable amount is calculated server-side when the checkout session is created.",
} as const;

export const security = {
  eyebrow: "Security",
  title: "Specific controls, not vague badges",
  items: [
    { title: "Non-custodial", body: "Customers pay wallets you publish. GressPay does not hold balances or settle payouts." },
    { title: "AES-256-GCM credentials", body: "API keys, webhook secrets and wallet secrets are encrypted at rest per brand." },
    { title: "HMAC-signed webhooks", body: "Deliveries include a signature your backend can verify before fulfilling." },
    { title: "Parsed SMS fields only", body: "The companion uploads amount, TrxID, sender and wallet — not the raw message body." },
    { title: "OTP filtering", body: "OTP and promo SMS are rejected on-device and never leave the phone." },
    { title: "Rate limiting", body: "Auth, checkout and companion endpoints are rate-limited to blunt brute force and spam." },
  ],
} as const;

export const developers = {
  eyebrow: "Developers",
  title: "Create a checkout in a few lines",
  body: "Brand-scoped live keys, X-GressPay-Brand header, and signed webhooks. Snippets match the real API paths.",
  cta: { href: "/developers", label: "Full API documentation" },
} as const;

export const pricing = {
  eyebrow: "Pricing",
  title: "Plans for one shop or an agency stack",
  subtitle: "0% GressPay transaction commission. Customers pay your wallet directly. Optional brand/gateway fees you configure are separate.",
  billingNote: "Monthly and yearly BDT prices. USD equivalents shown for planning — charging currency depends on your billing checkout.",
  plans: [
    {
      id: "starter" as const,
      name: "Starter",
      blurb: "One website, unlimited checkouts after Trial.",
      monthlyBdt: 999 as number | null,
      yearlyBdt: 9990 as number | null,
      highlight: false,
      lifetimeBdt: null as number | null,
      features: ["1 website", "Unlimited completed checkouts", "1 companion device", "HMAC webhooks", "0% platform commission"],
    },
    {
      id: "pro" as const,
      name: "Pro",
      blurb: "More sites, devices and priority retries.",
      monthlyBdt: 2999 as number | null,
      yearlyBdt: 29990 as number | null,
      highlight: true,
      lifetimeBdt: null as number | null,
      features: ["5 websites", "Unlimited checkouts", "5 companion devices", "Priority webhook retries", "Crypto rails + branding"],
    },
    {
      id: "lifetime" as const,
      name: "Enterprise Lifetime",
      blurb: "One-time unlock for agencies that need headroom.",
      monthlyBdt: null as number | null,
      yearlyBdt: null as number | null,
      highlight: false,
      lifetimeBdt: 49999 as number | null,
      features: ["Up to 50 websites", "Highest device limits", "Lifetime license", "Priority support lane"],
    },
  ],
  trial: "New accounts start on Trial: 1 website and up to 50 completed checkouts per calendar month (Asia/Dhaka).",
} as const;

export const faq = [
  {
    q: "Does GressPay hold my customers' money?",
    a: "No. Customers transfer straight into the receiving wallets you configure. We verify evidence and notify your systems.",
  },
  {
    q: "How does bKash or Nagad verification work?",
    a: "Install the Android companion on the phone with your payment SIM. When a payment SMS arrives, the app sends parsed fields to GressPay. The server matches amount and TrxID to the open checkout. OTP and promo SMS are filtered and never uploaded.",
  },
  {
    q: "Can I use GressPay without the companion app?",
    a: "Crypto rails (USDT, Binance Pay, Bybit Pay) verify without SMS. Bangladesh MFS rails require companion evidence or an explicit operator-approved verification mode.",
  },
  {
    q: "Do you charge a percentage per payment?",
    a: "GressPay does not take a platform commission on each transfer. Subscription plans cover the product. Any fee percentage you set on a method is your brand fee, shown at checkout.",
  },
  {
    q: "Is the globe or ticker showing live payments?",
    a: "No. Globe arcs and sample amounts on the marketing site are illustrative. Dashboard metrics show your real ledger after you connect.",
  },
] as const;

export const cta = {
  title: "Put verification between the payment and the order.",
  body: "Create an account, add a wallet, pair a device, and share a payment link. Start on Trial — upgrade when you need more websites or devices.",
  primary: { href: "/register", label: "Start on Trial" },
  secondary: { href: "/fees", label: "Compare plans" },
} as const;

export const footer = {
  blurb: "Bangladesh payment verification for wallets you configure. Optional Binance Pay and USDT TRC-20 are separate. GressPay does not hold the funds.",
  columns: [
    {
      title: "Product",
      links: [
        { href: "/services", label: "Services" },
        { href: "/fees", label: "Pricing" },
        { href: "/download", label: "Companion APK" },
        { href: "/status", label: "Status" },
      ],
    },
    {
      title: "Developers",
      links: [
        { href: "/developers", label: "API docs" },
        { href: "/checkout-preview", label: "Checkout preview" },
        { href: "/help", label: "Help" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/legal/terms", label: "Terms" },
        { href: "/legal/privacy", label: "Privacy" },
        { href: "/legal/security", label: "Security" },
      ],
    },
  ],
} as const;

export const downloadCopy = {
  title: "Download the GressPay companion",
  body: "Sideload the APK on the Android phone that receives payment SMS. Pair with a device key from the dashboard, then bind an active gateway.",
  steps: [
    "Open this page on the phone (or transfer the APK).",
    "Allow install from this source if Android asks.",
    "Open GressPay Companion and paste the gpdev_ key shown once in Devices.",
    "Grant SMS permission for payment senders only — OTP texts stay on-device.",
    "If Play Protect warns about an unknown app, review the SHA-256 below and choose Install anyway only if the hash matches.",
  ],
} as const;

export const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: site.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  description: site.description,
  url: site.url,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BDT", description: "Trial plan available" },
  provider: { "@type": "Organization", name: site.name, url: site.url, email: site.contactEmail },
} as const;
