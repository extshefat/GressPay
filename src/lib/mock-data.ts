import {
  PaymentMethod,
  Transaction,
  PaymentLink,
  Invoice,
  DashboardMetrics,
  ExchangeRatesResponse,
  ApiCredentials,
  User,
} from "./types/api";

const logo = "/methods/bkash.svg";

export const MOCK_USER: User = {
  id: "usr_gress_001",
  name: "GressPay Merchant",
  email: "founder@gresspay.io",
  businessName: "GressPay Global HQ",
  role: "merchant",
  isVerified: true,
  createdAt: "2026-01-15T08:00:00Z",
};

export const MOCK_EXCHANGE_RATES: ExchangeRatesResponse = {
  base: "USD",
  updatedAt: new Date().toISOString(),
  rates: {
    USD: 1.0,
    USDT: 1.0002,
    BDT: 122.5,
    INR: 88.4,
    PKR: 284.1,
    NPR: 141.2,
    EUR: 0.92,
  },
};

function rail(
  code: string,
  name: string,
  country: PaymentMethod["country"],
  category: PaymentMethod["category"],
  currency: PaymentMethod["currency"],
  fee: number,
  deposit: string,
  instructions: string,
  logoPath?: string
): PaymentMethod {
  return {
    code,
    name,
    country,
    category,
    logo: logoPath || `/methods/${code}.svg`,
    currency,
    feePercentage: fee,
    fixedFee: 0,
    minAmount: currency === "USDT" || currency === "USD" ? 1 : 50,
    maxAmount: currency === "USDT" || currency === "USD" ? 50000 : 25000,
    isEnabled: true,
    isAutomated: category === "mfs" || code === "upi_qr",
    requiresTxidInput: true,
    instructions,
    depositAddressOrNumber: deposit,
  };
}

export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  rail("bkash", "bKash", "BD", "mfs", "BDT", 1.2, "01700-000000", "Send Money to bKash Personal and enter the TxID."),
  rail("nagad", "Nagad", "BD", "mfs", "BDT", 1.0, "01800-000000", "Send Money to Nagad and enter the TxID."),
  rail("rocket", "Rocket", "BD", "mfs", "BDT", 1.2, "01900-000000", "Cash-in / Send Money via Rocket and enter TxID."),
  rail("upay", "Upay", "BD", "mfs", "BDT", 1.2, "01600-000000", "Send Money to Upay and enter TxID."),
  rail("cellfin", "Cellfin", "BD", "mfs", "BDT", 1.0, "01500-000000", "Transfer via Cellfin and enter reference."),
  rail("upi_qr", "UPI QR", "IN", "bank_upi", "INR", 0.0, "merchant@upi", "Scan UPI QR / pay and enter UTR."),
  rail("phonepe", "PhonePe", "IN", "bank_upi", "INR", 0.0, "merchant@ybl", "Pay with PhonePe and enter UTR."),
  rail("easypaisa", "Easypaisa", "PK", "mfs", "PKR", 1.5, "0300-0000000", "Send to Easypaisa and enter TxID."),
  rail("jazzcash", "JazzCash", "PK", "mfs", "PKR", 1.5, "0301-0000000", "Send to JazzCash and enter TxID."),
  rail("esewa", "eSewa", "NP", "mfs", "NPR", 1.0, "98xxxxxxxx", "Pay via eSewa and enter reference."),
  rail("khalti", "Khalti", "NP", "mfs", "NPR", 1.0, "98xxxxxxxx", "Pay via Khalti and enter reference."),
  rail("binance_pay", "Binance Pay", "GLOBAL", "crypto", "USDT", 0.5, "BINANCE_PAY_ID", "Pay with Binance Pay and enter order ID."),
  rail("bybit_pay", "Bybit Pay", "GLOBAL", "crypto", "USDT", 0.5, "BYBIT_PAY_ID", "Pay with Bybit Pay and enter reference."),
  rail("usdt_trc20", "USDT TRC-20", "GLOBAL", "crypto", "USDT", 0.0, "TXXXX…demo", "Transfer USDT (TRC-20) and enter txid."),
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "txn_demo_001",
    merchantId: MOCK_USER.id,
    merchantName: MOCK_USER.businessName,
    customerName: "Ayesha",
    customerEmail: "a@shop.bd",
    amount: 1500,
    currency: "BDT",
    fee: 18,
    netAmount: 1482,
    paymentMethod: "bkash",
    paymentMethodTitle: "bKash",
    txid: "8H7K2M9P1Q",
    status: "COMPLETED",
    ledgerMode: "test",
    confirmationState: "simulated",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    id: "txn_demo_002",
    merchantId: MOCK_USER.id,
    merchantName: MOCK_USER.businessName,
    customerName: "Rahul",
    amount: 499,
    currency: "INR",
    fee: 0,
    netAmount: 499,
    paymentMethod: "upi_qr",
    paymentMethodTitle: "UPI QR",
    txid: "UTR123456789",
    status: "PENDING",
    ledgerMode: "live",
    confirmationState: "submitted",
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
];

export const MOCK_PAYMENT_LINKS: PaymentLink[] = [
  {
    id: "plink_demo_001",
    merchantId: MOCK_USER.id,
    title: "Website checkout",
    description: "Reusable hosted link",
    amount: 25,
    currency: "USD",
    type: "reusable",
    allowedMethods: MOCK_PAYMENT_METHODS.map((m) => m.code),
    isActive: true,
    viewsCount: 42,
    paymentsCount: 7,
    totalCollected: 175,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    payUrl: "/pay/plink_demo_001",
  },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv_demo_001",
    invoiceNumber: "GP-10021",
    merchantId: MOCK_USER.id,
    merchantName: MOCK_USER.businessName,
    clientName: "North Star Ltd",
    clientEmail: "ap@northstar.example",
    items: [
      {
        id: "item_1",
        description: "Gateway setup",
        quantity: 1,
        unitPrice: 100,
        total: 100,
      },
    ],
    subtotal: 100,
    tax: 0,
    discount: 0,
    total: 100,
    currency: "USD",
    status: "SENT",
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    createdAt: new Date().toISOString(),
    payUrl: "/pay/inv_demo_001",
  },
];

export const MOCK_METRICS: DashboardMetrics = {
  totalRevenueUsd: 12840,
  totalRevenueBdt: 1572900,
  todayTransactions: 14,
  successRate: 96.4,
  activeLinksCount: 3,
  pendingSettlementUsd: 420,
  volumeHistory: [
    { date: "2026-10-18", bdt: 120000, cryptoUsd: 400 },
    { date: "2026-10-19", bdt: 98000, cryptoUsd: 220 },
    { date: "2026-10-20", bdt: 150000, cryptoUsd: 610 },
    { date: "2026-10-21", bdt: 88000, cryptoUsd: 180 },
    { date: "2026-10-22", bdt: 132000, cryptoUsd: 540 },
    { date: "2026-10-23", bdt: 110000, cryptoUsd: 300 },
    { date: "2026-10-24", bdt: 76000, cryptoUsd: 150 },
  ],
};

export const MOCK_API_CREDENTIALS: ApiCredentials = {
  merchantId: MOCK_USER.id,
  livePublicKey: "gp_live_pk_demo",
  liveSecretKey: "gp_live_sk_demo_••••••••",
  sandboxPublicKey: "gp_test_pk_demo",
  sandboxSecretKey: "gp_test_sk_demo_••••••••",
  webhookSecret: "gpwh_demo_secret",
  webhookUrl: "https://example.com/webhooks/gresspay",
};

// silence unused
void logo;
