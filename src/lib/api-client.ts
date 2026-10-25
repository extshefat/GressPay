import {
  MOCK_USER,
  MOCK_PAYMENT_METHODS,
  MOCK_TRANSACTIONS,
  MOCK_PAYMENT_LINKS,
  MOCK_INVOICES,
  MOCK_METRICS,
  MOCK_EXCHANGE_RATES,
  MOCK_API_CREDENTIALS,
} from "./mock-data";
import {
  User,
  Transaction,
  PaymentLink,
  Invoice,
  PaymentMethod,
  CheckoutSession,
  CheckoutStatusResponse,
  ExchangeRatesResponse,
  DashboardMetrics,
  ApiCredentials,
  Currency,
  MerchantSettings,
  AdminMerchant,
  AdminPlan,
  AdminSubscription,
  AdminAuditLog,
  AdminStats,
} from "./types/api";
import { METHOD_THEMES } from "./method-theme";

/** Explicit live only — anything else is demo/mock and must be labeled as such. */
export const IS_MOCK = process.env.NEXT_PUBLIC_DATA_SOURCE !== "live";
export const DATA_SOURCE: "live" | "mock" = IS_MOCK ? "mock" : "live";
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

const RELEASE_CODES = new Set(["bkash", "nagad", "binance_pay", "usdt_trc20"]);

function usdRate(code: string): number {
  const rates = MOCK_EXCHANGE_RATES.rates as Record<string, number>;
  return rates[code] || 1;
}

function hydrateMethod(
  method: PaymentMethod,
  amount?: number,
  currency?: Currency
): PaymentMethod {
  const theme = method.theme ?? METHOD_THEMES[method.code];
  if (amount === undefined || !currency) {
    return { ...method, theme };
  }
  const usd = currency === "USD" || currency === "USDT" ? amount : amount / usdRate(currency);
  const payable =
    method.currency === "USD" || method.currency === "USDT"
      ? usd
      : usd * usdRate(method.currency);
  return {
    ...method,
    theme,
    payableAmount: Number(payable.toFixed(2)),
    payableCurrency: method.currency,
  };
}

class ApiClient {
  private token: string | null = null;
  private ledgerMode: "live" | "test" = "live";

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("gresspay_jwt");
      const mode = localStorage.getItem("gresspay_ledger_mode");
      if (mode === "live" || mode === "test") this.ledgerMode = mode;
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("gresspay_jwt", token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("gresspay_jwt");
    }
  }

  getLedgerMode(): "live" | "test" {
    return this.ledgerMode;
  }

  setLedgerMode(mode: "live" | "test") {
    this.ledgerMode = mode;
    if (typeof window !== "undefined") {
      localStorage.setItem("gresspay_ledger_mode", mode);
      window.dispatchEvent(new Event("gresspay-mode"));
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    headers.set("X-GressPay-Mode", this.ledgerMode);
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message =
        errData?.error?.message || errData?.message || `API Error: ${res.status}`;
      throw new Error(message);
    }

    return res.json();
  }

  async getMe(): Promise<{ user: User }> {
    if (IS_MOCK) return { user: MOCK_USER };
    return this.request<{ user: User }>("/api/v1/me");
  }

  async login(email: string, password?: string): Promise<{ token: string; user: User }> {
    if (IS_MOCK) {
      this.setToken("mock_jwt_token_gresspay_123");
      return { token: "mock_jwt_token_gresspay_123", user: { ...MOCK_USER, email } };
    }
    const res = await this.request<{ token: string; user: User }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async getAuthProviders(): Promise<{
    password: boolean;
    google: { enabled: boolean; clientId: string | null };
  }> {
    if (IS_MOCK) {
      return { password: true, google: { enabled: false, clientId: null } };
    }
    return this.request<{
      password: boolean;
      google: { enabled: boolean; clientId: string | null };
    }>("/api/v1/auth/providers");
  }

  async getGoogleAuthUrl(redirectUri?: string): Promise<{
    enabled: boolean;
    url?: string;
    state?: string;
    reason?: string;
  }> {
    if (IS_MOCK) {
      return {
        enabled: false,
        reason: "Google OAuth is not configured on this GressPay platform instance.",
      };
    }
    const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : "";
    return this.request<{
      enabled: boolean;
      url?: string;
      state?: string;
      reason?: string;
    }>(`/api/v1/auth/google/url${query}`);
  }

  async handleGoogleCallback(payload: {
    code: string;
    state: string;
    code_verifier?: string;
  }): Promise<{ token: string; user: User; isNew?: boolean }> {
    if (IS_MOCK) {
      this.setToken("mock_jwt_token_google");
      return { token: "mock_jwt_token_google", user: MOCK_USER, isNew: false };
    }
    const res = await this.request<{ token: string; user: User; isNew?: boolean }>(
      "/api/v1/auth/google/callback",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async register(payload: {
    name: string;
    email: string;
    password: string;
    businessName: string;
  }): Promise<{ token: string; user: User }> {
    if (IS_MOCK) {
      this.setToken("mock_jwt_token_gresspay_123");
      return {
        token: "mock_jwt_token_gresspay_123",
        user: {
          ...MOCK_USER,
          name: payload.name,
          email: payload.email,
          businessName: payload.businessName,
        },
      };
    }
    return this.request<{ token: string; user: User }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getTransactions(): Promise<{ transactions: Transaction[]; total: number }> {
    if (IS_MOCK) {
      const txs = MOCK_TRANSACTIONS.filter(
        (t) => !t.ledgerMode || t.ledgerMode === this.ledgerMode
      );
      return { transactions: txs, total: txs.length };
    }
    return this.request<{ transactions: Transaction[]; total: number }>("/api/v1/transactions");
  }

  async getTransaction(id: string): Promise<Transaction> {
    if (IS_MOCK) {
      return MOCK_TRANSACTIONS.find((t) => t.id === id) || MOCK_TRANSACTIONS[0];
    }
    return this.request<Transaction>(`/api/v1/transactions/${id}`);
  }

  async confirmTransaction(id: string, reason: string): Promise<Transaction> {
    if (IS_MOCK) {
      const tx = MOCK_TRANSACTIONS.find((t) => t.id === id) || MOCK_TRANSACTIONS[0];
      return { ...tx, status: "COMPLETED", confirmationState: "merchant_confirmed" };
    }
    return this.request<Transaction>(`/api/v1/transactions/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async listCompanionDevices(): Promise<{
    devices: { deviceId: string; label: string; status: string; lastSeenAt?: string; createdAt?: string }[];
  }> {
    if (IS_MOCK) {
      return {
        devices: [
          {
            deviceId: "dev_demo",
            label: "Demo phone",
            status: "active",
            lastSeenAt: new Date().toISOString(),
          },
        ],
      };
    }
    return this.request("/api/v1/companion/devices");
  }

  async revokeCompanionDevice(deviceId: string): Promise<{ ok: boolean }> {
    if (IS_MOCK) return { ok: true };
    return this.request(`/api/v1/companion/devices/${deviceId}/revoke`, { method: "POST", body: "{}" });
  }

  async getBinancePayStatus(): Promise<{
    configured: boolean;
    liveReady: boolean;
    note?: string;
  }> {
    if (IS_MOCK) {
      return { configured: false, liveReady: false, note: "Demo — Binance Pay not live." };
    }
    return this.request("/api/v1/merchant/binance-pay");
  }

  async saveBinancePayCredentials(payload: {
    apiKey: string;
    secret: string;
    certificateSn: string;
  }): Promise<{ configured: boolean; liveReady: boolean }> {
    if (IS_MOCK) {
      return { configured: true, liveReady: false };
    }
    return this.request("/api/v1/merchant/binance-pay", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async clearBinancePayCredentials(): Promise<{ configured: boolean; liveReady: boolean }> {
    if (IS_MOCK) {
      return { configured: false, liveReady: false };
    }
    return this.request("/api/v1/merchant/binance-pay", {
      method: "PUT",
      body: JSON.stringify({ clear: true }),
    });
  }

  async getPaymentLinks(): Promise<{ links: PaymentLink[] }> {
    if (IS_MOCK) return { links: MOCK_PAYMENT_LINKS };
    return this.request<{ links: PaymentLink[] }>("/api/v1/payment-links");
  }

  async createPaymentLink(payload: Partial<PaymentLink>): Promise<{ link: PaymentLink }> {
    if (IS_MOCK) {
      const newLink: PaymentLink = {
        id: `plink_${Date.now()}`,
        merchantId: MOCK_USER.id,
        title: payload.title || "Custom Charge",
        description: payload.description || "",
        amount: payload.amount ?? 10,
        currency: payload.currency || "USD",
        type: payload.type || "reusable",
        allowedMethods: payload.allowedMethods || [
          "bkash",
          "nagad",
          "upi_qr",
          "binance_pay",
          "usdt_trc20",
        ],
        isActive: true,
        viewsCount: 0,
        paymentsCount: 0,
        totalCollected: 0,
        createdAt: new Date().toISOString(),
        payUrl: `/pay/plink_${Date.now()}`,
      };
      return { link: newLink };
    }
    return this.request<{ link: PaymentLink }>("/api/v1/payment-links", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getInvoices(): Promise<{ invoices: Invoice[] }> {
    if (IS_MOCK) return { invoices: MOCK_INVOICES };
    return this.request<{ invoices: Invoice[] }>("/api/v1/invoices");
  }

  async createInvoice(payload: {
    customer_name: string;
    customer_email: string;
    amount: number;
    currency: string;
    note?: string;
  }): Promise<{ invoice: Invoice }> {
    if (IS_MOCK) {
      const id = `inv_${Date.now()}`;
      const invoice: Invoice = {
        id,
        invoiceNumber: `GP-${Date.now().toString().slice(-6)}`,
        merchantId: MOCK_USER.id,
        merchantName: MOCK_USER.businessName,
        clientName: payload.customer_name,
        clientEmail: payload.customer_email,
        items: [
          {
            id: "item_1",
            description: payload.note || "Payment",
            quantity: 1,
            unitPrice: payload.amount,
            total: payload.amount,
          },
        ],
        subtotal: payload.amount,
        tax: 0,
        discount: 0,
        total: payload.amount,
        currency: payload.currency as Currency,
        status: "SENT",
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        payUrl: `/pay/${id}`,
      };
      return { invoice };
    }
    return this.request<{ invoice: Invoice }>("/api/v1/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getPaymentMethods(): Promise<{ methods: PaymentMethod[] }> {
    if (IS_MOCK) {
      return {
        methods: MOCK_PAYMENT_METHODS.filter((m) => RELEASE_CODES.has(m.code)).map((m) =>
          hydrateMethod({
            ...m,
            liveReady: Boolean(m.depositAddressOrNumber),
            readinessReasons: m.depositAddressOrNumber ? [] : ["Demo: set a wallet number"],
            integrationType:
              m.code === "bkash" || m.code === "nagad"
                ? "personal_sms_match"
                : m.code === "binance_pay"
                  ? "binance_pay_merchant"
                  : "onchain_trc20",
          })
        ),
      };
    }
    const res = await this.request<{ methods: PaymentMethod[] }>("/api/v1/methods");
    return { methods: (res.methods || []).map((m) => hydrateMethod(m)) };
  }

  async updatePaymentMethod(
    code: string,
    isEnabled: boolean,
    options?: { account?: string; depositAddressOrNumber?: string }
  ): Promise<{ method: PaymentMethod; isEnabled: boolean }> {
    if (IS_MOCK) {
      const method = MOCK_PAYMENT_METHODS.find((m) => m.code === code) || MOCK_PAYMENT_METHODS[0];
      const next = hydrateMethod({
        ...method,
        isEnabled,
        depositAddressOrNumber: options?.account || options?.depositAddressOrNumber || method.depositAddressOrNumber,
      });
      return { method: next, isEnabled };
    }
    return this.request<{ method: PaymentMethod; isEnabled: boolean }>(`/api/v1/methods/${code}`, {
      method: "PUT",
      body: JSON.stringify({ isEnabled, options }),
    });
  }

  async listGateways(): Promise<{
    gateways: import("@/lib/types/api").MerchantGateway[];
    r2Configured: boolean;
    maxUploadBytes: number;
    allowedQrMime: string[];
  }> {
    if (IS_MOCK) {
      return { gateways: [], r2Configured: false, maxUploadBytes: 5242880, allowedQrMime: ["image/png", "image/jpeg", "image/webp"] };
    }
    return this.request("/api/v1/gateways");
  }

  async createGateway(payload: Record<string, unknown>): Promise<{ gateway: import("@/lib/types/api").MerchantGateway }> {
    return this.request("/api/v1/gateways", { method: "POST", body: JSON.stringify(payload) });
  }

  async updateGateway(id: string, payload: Record<string, unknown>): Promise<{ gateway: import("@/lib/types/api").MerchantGateway }> {
    return this.request(`/api/v1/gateways/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  }

  async enableGateway(id: string): Promise<{ gateway: import("@/lib/types/api").MerchantGateway }> {
    return this.request(`/api/v1/gateways/${id}/enable`, { method: "POST", body: "{}" });
  }

  async disableGateway(id: string): Promise<{ gateway: import("@/lib/types/api").MerchantGateway }> {
    return this.request(`/api/v1/gateways/${id}/disable`, { method: "POST", body: "{}" });
  }

  async deleteGateway(id: string): Promise<{ ok: boolean }> {
    return this.request(`/api/v1/gateways/${id}`, { method: "DELETE" });
  }

  async reorderGateways(order: string[]): Promise<unknown> {
    return this.request("/api/v1/gateways/reorder", {
      method: "PUT",
      body: JSON.stringify({ order }),
    });
  }

  async qrUploadIntent(
    id: string,
    contentType: string,
    byteSize: number
  ): Promise<{
    uploadUrl: string;
    requiredHeaders: Record<string, string>;
    objectKey: string;
    expiresIn: number;
    maxBytes: number;
  }> {
    return this.request(`/api/v1/gateways/${id}/qr/upload-intent`, {
      method: "POST",
      body: JSON.stringify({ contentType, byteSize }),
    });
  }

  async qrUploadComplete(id: string, objectKey: string): Promise<{ gateway: import("@/lib/types/api").MerchantGateway }> {
    return this.request(`/api/v1/gateways/${id}/qr/complete`, {
      method: "POST",
      body: JSON.stringify({ objectKey }),
    });
  }

  async deleteGatewayQr(id: string): Promise<{ gateway: import("@/lib/types/api").MerchantGateway }> {
    return this.request(`/api/v1/gateways/${id}/qr`, { method: "DELETE" });
  }

  async previewGatewayQr(id: string): Promise<{ url: string; expiresIn: number }> {
    return this.request(`/api/v1/gateways/${id}/qr/preview`);
  }

  async createBinancePayOrder(sessionId: string): Promise<{
    checkoutUrl?: string;
    merchantTradeNo?: string;
    status?: string;
    liveReady?: boolean;
    message?: string;
  }> {
    if (IS_MOCK) {
      return {
        status: "pending_unconfigured",
        liveReady: false,
        message: "Demo mode — Binance Pay is not live.",
      };
    }
    return this.request(`/api/v1/checkout/${sessionId}/binance/create`, { method: "POST", body: "{}" });
  }

  async getExchangeRates(): Promise<ExchangeRatesResponse> {
    if (IS_MOCK) return MOCK_EXCHANGE_RATES;
    return this.request<ExchangeRatesResponse>("/api/v1/rates");
  }

  async getMetrics(): Promise<DashboardMetrics> {
    if (IS_MOCK) return MOCK_METRICS;
    return this.request<DashboardMetrics>("/api/v1/dashboard/metrics");
  }

  async getApiCredentials(): Promise<ApiCredentials> {
    if (IS_MOCK) return MOCK_API_CREDENTIALS;
    return this.request<ApiCredentials>("/api/v1/merchant/api-keys");
  }

  async getSettings(): Promise<MerchantSettings> {
    if (IS_MOCK) {
      return {
        businessName: MOCK_USER.businessName,
        webhookUrl: MOCK_API_CREDENTIALS.webhookUrl || "",
        currency: "USD",
      };
    }
    return this.request<MerchantSettings>("/api/v1/merchant/settings");
  }

  async updateSettings(payload: {
    businessName?: string;
    webhookUrl?: string;
    cryptoEnabled?: boolean;
  }): Promise<MerchantSettings> {
    if (IS_MOCK) {
      return {
        businessName: payload.businessName || MOCK_USER.businessName,
        webhookUrl: payload.webhookUrl || "",
        currency: "BDT",
        cryptoEnabled: payload.cryptoEnabled ?? false,
        operatorCryptoAllowed: false,
        binancePayConfigured: false,
      };
    }
    return this.request<MerchantSettings>("/api/v1/merchant/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async rotateWebhookSecret(): Promise<{ webhookSecret: string; note: string }> {
    if (IS_MOCK) {
      return {
        webhookSecret: `gpwh_${Date.now().toString(16)}mocksecret`,
        note: "Shown once. Use this to verify X-GressPay-Signature.",
      };
    }
    return this.request<{ webhookSecret: string; note: string }>(
      "/api/v1/merchant/webhook-secret/rotate",
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  async testWebhookPing(): Promise<{ ok: boolean; message: string }> {
    if (IS_MOCK) return { ok: true, message: "Mock webhook ping accepted." };
    return this.request<{ ok: boolean; message: string }>("/api/v1/webhooks/test-ping", {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  /** Hosted page: init or resume session for link / invoice / chs_* */
  async initCheckout(linkId: string): Promise<CheckoutSession> {
    if (IS_MOCK) {
      const link = MOCK_PAYMENT_LINKS.find((l) => l.id === linkId) || MOCK_PAYMENT_LINKS[0];
      return {
        sessionId: linkId.startsWith("chs_") ? linkId : `chs_${Date.now()}`,
        linkId: link.id,
        payUrl: `/pay/${linkId}`,
        merchantName: "GressPay Global HQ",
        merchantVerified: false,
        orderTitle: link.title,
        orderDescription: link.description,
        amount: link.amount || 25,
        currency: link.currency,
        availableMethods: MOCK_PAYMENT_METHODS.map((m) =>
          hydrateMethod(m, link.amount || 25, link.currency)
        ),
        ledgerMode: this.ledgerMode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
    }
    return this.request<CheckoutSession>(`/api/v1/checkout/${linkId}/init`, {
      method: "POST",
    });
  }

  async createCheckout(payload: {
    amount: number;
    currency: string;
    full_name?: string;
    email?: string;
    mobile?: string;
    return_url?: string;
    webhook_url?: string;
    order_title?: string;
    order_description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<CheckoutSession> {
    if (IS_MOCK) {
      const sessionId = `chs_${Date.now()}`;
      return {
        sessionId,
        linkId: sessionId,
        payUrl: `/pay/${sessionId}`,
        returnUrl: payload.return_url || null,
        merchantName: "GressPay Demo",
        merchantVerified: false,
        orderTitle: payload.order_title || "Payment",
        orderDescription: payload.order_description,
        amount: payload.amount,
        currency: payload.currency as Currency,
        availableMethods: MOCK_PAYMENT_METHODS.map((m) =>
          hydrateMethod(m, payload.amount, payload.currency as Currency)
        ),
        ledgerMode: this.ledgerMode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
    }
    return this.request<CheckoutSession>("/api/v1/checkout/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /** Buyer submits TxID on hosted checkout (public). */
  async verifyCheckout(
    sessionId: string,
    trxId: string,
    method: string,
    gatewayId?: string
  ): Promise<CheckoutStatusResponse> {
    if (IS_MOCK) {
      return {
        sessionId,
        status: this.ledgerMode === "test" ? "COMPLETED" : "PENDING",
        amount: 25,
        currency: "USD",
        paymentMethod: method,
        txid: trxId,
        confirmationState: this.ledgerMode === "test" ? "simulated" : "submitted",
        ledgerMode: this.ledgerMode,
      };
    }
    return this.request<CheckoutStatusResponse>(`/api/v1/checkout/${sessionId}/verify`, {
      method: "POST",
      body: JSON.stringify({
        trx_id: trxId,
        method,
        ...(gatewayId ? { gatewayId } : {}),
      }),
    });
  }

  /** Merchant verify — status by sessionId. */
  async verifyPayment(sessionId: string): Promise<CheckoutStatusResponse> {
    if (IS_MOCK) {
      return {
        sessionId,
        status: "COMPLETED",
        amount: 25,
        currency: "USD",
        confirmationState: "simulated",
      };
    }
    return this.request<CheckoutStatusResponse>("/api/v1/checkout/verify-payment", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
  }

  async getCheckoutStatus(sessionId: string): Promise<CheckoutStatusResponse> {
    if (IS_MOCK) {
      return {
        sessionId,
        status: "PENDING",
        amount: 25,
        currency: "USD",
        confirmationState: "none",
      };
    }
    return this.request<CheckoutStatusResponse>(`/api/v1/checkout/${sessionId}/status`);
  }

  // --- Admin API Methods ---
  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>("/api/v1/admin/stats");
  }

  async getAdminMerchants(): Promise<{ merchants: AdminMerchant[] }> {
    return this.request<{ merchants: AdminMerchant[] }>("/api/v1/admin/merchants");
  }

  async adjustAdminCredit(
    merchantId: string,
    delta: number,
    reason: string
  ): Promise<{ ok: boolean; credits: number }> {
    return this.request<{ ok: boolean; credits: number }>(
      `/api/v1/admin/merchants/${merchantId}/credit`,
      {
        method: "POST",
        body: JSON.stringify({ delta, reason }),
      }
    );
  }

  async updateAdminMerchantStatus(
    merchantId: string,
    status: "active" | "suspended"
  ): Promise<{ ok: boolean; status: string }> {
    return this.request<{ ok: boolean; status: string }>(
      `/api/v1/admin/merchants/${merchantId}/status`,
      {
        method: "POST",
        body: JSON.stringify({ status }),
      }
    );
  }

  async getAdminPlans(): Promise<{ plans: AdminPlan[] }> {
    return this.request<{ plans: AdminPlan[] }>("/api/v1/admin/plans");
  }

  async createAdminPlan(payload: {
    name: string;
    code: string;
    priceBdt: number;
    creditAllowance: number;
    description?: string;
    isFree?: boolean;
    features?: string[];
  }): Promise<{ ok: boolean; planId: string }> {
    return this.request<{ ok: boolean; planId: string }>("/api/v1/admin/plans", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateAdminPlan(
    planId: string,
    payload: Partial<AdminPlan>
  ): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(`/api/v1/admin/plans/${planId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getAdminSubscriptions(): Promise<{ subscriptions: AdminSubscription[] }> {
    return this.request<{ subscriptions: AdminSubscription[] }>("/api/v1/admin/subscriptions");
  }

  async assignAdminSubscription(
    merchantId: string,
    planId: string
  ): Promise<{ ok: boolean; subscriptionId: string }> {
    return this.request<{ ok: boolean; subscriptionId: string }>(
      "/api/v1/admin/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({ merchantId, planId }),
      }
    );
  }

  async getAdminAuditLogs(): Promise<{ auditLogs: AdminAuditLog[] }> {
    return this.request<{ auditLogs: AdminAuditLog[] }>("/api/v1/admin/audit");
  }
}

export const api = new ApiClient();
