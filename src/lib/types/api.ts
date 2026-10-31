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
  is_admin?: boolean;
  planId?: string;
  plan_id?: string;
  planExpiresAt?: string | null;
  planUsage?: PlanUsage | null;
  status?: string;
  isVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface PlanUsage {
  billingTimezone: string;
  billingMonthLabel: string;
  planCode: string;
  brands: {
    used: number;
    limit: number;
    atLimit: boolean;
  };
  monthlyCompleted: {
    used: number;
    limit: number | null;
    unlimited: boolean;
    atLimit: boolean;
    warning: boolean;
  };
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
  | "disabled_by_admin"
  | "needs_companion"
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
  | "verifying"
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

export interface PaymentLinkCustomField {
  id: string;
  label: string;
  required?: boolean;
  type?: "text" | "email" | "phone";
}

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
  successRedirectUrl?: string;
  productImageUrl?: string;
  customFields?: PaymentLinkCustomField[];
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
  successRedirectUrl?: string | null;
  productImageUrl?: string | null;
  customFields?: PaymentLinkCustomField[];
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
  brandId?: string;
  hasWebhookSecret?: boolean;
  webhookSecret: string;
  webhookUrl?: string;
  checkoutUrl?: string;
  verifyUrl?: string;
  note?: string;
  /** @deprecated Legacy account-wide keys removed from dashboard — use Brands. */
  hasLiveKey?: boolean;
  hasSandboxKey?: boolean;
  livePublicKey?: string;
  liveSecretKey?: string;
  sandboxPublicKey?: string;
  sandboxSecretKey?: string;
  keys?: Array<{
    id: number;
    name: string;
    mode: string;
    prefix: string;
    masked: string;
    createdAt?: string | null;
    lastUsedAt?: string | null;
  }>;
}

export interface DashboardMetrics {
  totalRevenueUsd: number;
  totalRevenueBdt: number;
  todayRevenueBdt?: number;
  todayTransactions: number;
  successRate: number;
  activeLinksCount: number;
  activeMethodsCount?: number;
  connectedDevicesCount?: number;
  onlineDevicesCount?: number;
  pendingCheckoutCount?: number;
  unmatchedSmsCount?: number;
  lastDeviceSyncAt?: string | null;
  rangeDays?: number;
  volumeHistory: {
    date: string;
    bdt: number;
    cryptoUsd: number;
  }[];
  railBreakdown?: {
    code: string;
    label: string;
    volumeBdt: number;
  }[];
  subscription?: {
    planId: string;
    planName: string;
    planExpiresAt?: string | null;
    deviceLimit: number;
    methodLimit: number;
    devicesUsed: number;
    methodsUsed: number;
  };
  planUsage?: PlanUsage;
}

export interface MerchantSettings {
  businessName: string;
  brandName?: string;
  brandLogoUrl?: string;
  supportContact?: string;
  receiptFooter?: string;
  telegramBotTokenSet?: boolean;
  telegramChatId?: string;
  discordWebhookUrl?: string;
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
    rocket?: { enabled?: boolean; destinationConfigured?: boolean };
    upay?: { enabled?: boolean; destinationConfigured?: boolean };
    cellfin?: { enabled?: boolean; destinationConfigured?: boolean };
    usdt_trc20?: { enabled?: boolean; destinationConfigured?: boolean };
    bybit_pay?: { enabled?: boolean; destinationConfigured?: boolean };
    binance_pay?: { enabled?: boolean; credentialsConfigured?: boolean };
  };
}

export interface AdminPaymentWallets {
  bkash: string;
  nagad: string;
  rocket: string;
  upay: string;
  usdt_trc20: string;
  binance_uid: string;
  bybit_uid: string;
}

export interface AdminMerchant {
  id: string;
  name: string;
  email: string;
  role?: "admin" | "merchant";
  planId?: string;
  planExpiresAt?: string | null;
  brandId?: string;
  brandName: string;
  authProvider: string;
  status: "active" | "suspended";
  credits: number;
  transactionsCount: number;
  totalVolumeBdt?: number;
  deviceCount?: number;
  activeGatewaysCount?: number;
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

export interface AdminTransaction {
  id: string;
  sessionId: string;
  brandId: string;
  brandName: string;
  merchantId: string;
  merchantName: string;
  merchantEmail: string;
  amount: number;
  currency: string;
  methodCode: string;
  status: "initiated" | "pending" | "completed" | "failed" | "expired" | "refunded";
  trxId: string;
  customerNumber?: string;
  senderNumber?: string;
  verifiedAmount?: number | null;
  verifiedAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSmsLog {
  id: string;
  brandId: string;
  brandName: string;
  deviceId: string;
  deviceLabel: string;
  senderKey: string;
  amount: number;
  trxId: string;
  number?: string;
  status: "approved" | "used" | string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  priceBdt: number;
  billingCycle: string;
  creditAllowance: number;
  deviceLimit?: number;
  methodLimit?: number;
  features: string[];
  isFree: boolean;
  status: "active" | "archived" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface PlatformGateway {
  id: number;
  gateway_code: string;
  slug: string;
  display_name: string;
  category: "mfs" | "crypto";
  currency: string;
  is_enabled: number;
  display_order: number;
  instructions?: string | null;
  min_amount: number;
  max_amount: number;
  created_at: string;
  updated_at: string;
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
  merchants: { total: number; active: number; suspended?: number };
  transactions: {
    total: number;
    completed: number;
    pending?: number;
    failed?: number;
    volumeBdt: number;
    volumeUsdt: number;
  };
  devices?: { total: number; online: number };
  sms?: { total: number; matched: number; unmatched: number };
  webhooks?: { total: number; delivered: number; healthPercent: number };
  gateways?: { total: number; enabled: number };
  subscriptions: { activePlans: number; activeSubscriptions: number };
  system: { status: string; adminEmails: string[]; serverTime: string };
}
