/**
 * GressPay API contract shared by the Next.js app and PHP /api/v1.
 */

export type UserRole = "merchant" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  businessName: string;
  role: UserRole;
  isAdmin?: boolean;
  isVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export type Currency = "BDT" | "INR" | "PKR" | "NPR" | "USD" | "USDT";

export type CountryCode = "BD" | "IN" | "PK" | "NP" | "GLOBAL";

export type PaymentMethodCategory = "mfs" | "bank_upi" | "crypto" | "card";

export interface MethodTheme {
  primary: string;
  text: string;
  button: string;
  buttonText: string;
}

export interface PaymentMethod {
  code: string;
  name: string;
  country: CountryCode;
  category: PaymentMethodCategory;
  logo: string;
  currency: Currency;
  feePercentage: number;
  fixedFee: number;
  minAmount: number;
  maxAmount: number;
  isEnabled: boolean;
  isAutomated: boolean;
  requiresTxidInput: boolean;
  instructions?: string;
  instructionSteps?: { text: string }[];
  accountLabel?: string;
  depositAddressOrNumber?: string;
  theme?: MethodTheme;
  payableAmount?: number;
  payableCurrency?: Currency;
  trxHint?: string;
  releaseScope?: boolean;
  integrationType?: string;
  liveReady?: boolean;
  readinessReasons?: string[];
  gatewayId?: string;
  displayName?: string;
  qrImageUrl?: string | null;
  qrStatus?: string;
  readiness?: string;
}

export type GatewayReadiness =
  | "setup_incomplete"
  | "qr_pending"
  | "configured_disabled"
  | "ready_test"
  | "live_ready"
  | "needs_attention"
  | "disabled"
  | "qr_upload_unavailable";

export interface MerchantGateway {
  id: string;
  gatewayId: string;
  methodCode: string;
  displayName: string;
  accountType?: string;
  account?: string | null;
  depositAddressOrNumber?: string | null;
  currency: string;
  country: string;
  instructions?: string | null;
  minAmount?: string | null;
  maxAmount?: string | null;
  displayOrder: number;
  enabled: boolean;
  status: string;
  qrStatus: string;
  qrMime?: string | null;
  qrBytes?: number | null;
  supportsQr: boolean;
  readiness: GatewayReadiness | string;
  r2Configured?: boolean;
  qrImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type TransactionStatus = "PENDING" | "COMPLETED" | "EXPIRED" | "FAILED" | "REFUNDED";

export type ConfirmationState =
  | "none"
  | "submitted"
  | "matched"
  | "simulated"
  | "merchant_confirmed"
  | "provider_confirmed"
  | "completed";

export interface Transaction {
  id: string;
  invoiceId?: string;
  paymentLinkId?: string;
  merchantId: string;
  merchantName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  currency: Currency;
  fee: number;
  netAmount: number;
  paymentMethod: string;
  paymentMethodTitle: string;
  senderAccountOrAddress?: string;
  txid?: string;
  status: TransactionStatus;
  ledgerMode?: "live" | "test";
  confirmationState?: ConfirmationState;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  confirmedByMerchant?: boolean;
  confirmationReason?: string;
}

export type PaymentLinkType = "single_use" | "reusable";

export interface PaymentLink {
  id: string;
  merchantId: string;
  title: string;
  description?: string;
  amount: number | null;
  currency: Currency;
  type: PaymentLinkType;
  allowedMethods: string[];
  redirectUrl?: string;
  webhookUrl?: string;
  isActive: boolean;
  viewsCount: number;
  paymentsCount: number;
  totalCollected: number;
  createdAt: string;
  payUrl?: string;
}

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  merchantId: string;
  merchantName: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: Currency;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  payUrl?: string;
}

export interface CheckoutSession {
  sessionId: string;
  linkId: string;
  payUrl?: string;
  returnUrl?: string | null;
  merchantName: string;
  merchantLogo?: string;
  merchantVerified: boolean;
  orderTitle: string;
  orderDescription?: string;
  amount: number;
  currency: Currency;
  exchangeRateToUsd?: number;
  availableMethods: PaymentMethod[];
  ledgerMode?: "live" | "test";
  expiresAt: string;
  createdAt: string;
}

export interface CheckoutStatusResponse {
  sessionId: string;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  paymentMethod?: string;
  txid?: string;
  redirectUrl?: string;
  returnUrl?: string | null;
  paidAt?: string;
  confirmationState?: ConfirmationState;
  message?: string;
  ledgerMode?: "live" | "test";
}

export interface ExchangeRatesResponse {
  base: "USD";
  updatedAt: string;
  rates: {
    USD: number;
    USDT: number;
    BDT: number;
    INR: number;
    PKR: number;
    NPR: number;
    EUR: number;
  };
}

export interface ApiCredentials {
  merchantId: string;
  livePublicKey: string;
  liveSecretKey: string;
  sandboxPublicKey: string;
  sandboxSecretKey: string;
  webhookSecret: string;
  webhookUrl?: string;
}

export interface DashboardMetrics {
  totalRevenueUsd: number;
  totalRevenueBdt: number;
  todayTransactions: number;
  successRate: number;
  activeLinksCount: number;
  pendingSettlementUsd: number;
  volumeHistory: {
    date: string;
    bdt: number;
    cryptoUsd: number;
  }[];
}

export interface MerchantSettings {
  businessName: string;
  webhookUrl: string;
  currency: Currency;
  cryptoEnabled?: boolean;
  operatorCryptoAllowed?: boolean;
  tronProviderConfigured?: boolean;
  usdtConfirmations?: number;
  usdtContract?: string;
  binancePayConfigured?: boolean;
  activeCompanionDevices?: number;
  rails?: {
    bkash?: { enabled?: boolean; destinationConfigured?: boolean };
    nagad?: { enabled?: boolean; destinationConfigured?: boolean };
    usdt_trc20?: { enabled?: boolean; destinationConfigured?: boolean };
    binance_pay?: { enabled?: boolean; credentialsConfigured?: boolean };
  };
}

export interface AdminMerchant {
  id: string;
  name: string;
  email: string;
  brandId?: string;
  brandName: string;
  authProvider: string;
  status: "active" | "suspended";
  credits: number;
  transactionsCount: number;
  subscription?: {
    id: string;
    planId: string;
    planName: string;
    planCode: string;
    creditsRemaining: number;
    creditsUsed: number;
    startsAt: string;
    expiresAt?: string | null;
  } | null;
  createdAt: string;
}

export interface AdminPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  priceBdt: number;
  billingCycle: string;
  creditAllowance: number;
  features: string[];
  isFree: boolean;
  status: "active" | "archived" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface AdminSubscription {
  id: string;
  merchantId: string;
  merchantName?: string;
  merchantEmail?: string;
  planId: string;
  planName: string;
  planCode: string;
  status: "active" | "archived" | "expired" | "canceled";
  creditsRemaining: number;
  creditsUsed: number;
  startsAt: string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorEmail: string;
  targetType: string;
  targetId: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AdminStats {
  merchants: { total: number; active: number };
  transactions: { total: number; completed: number; volumeBdt: number; volumeUsdt: number };
  subscriptions: { activePlans: number; activeSubscriptions: number };
  system: { status: string; adminEmails: string[]; serverTime: string };
}
