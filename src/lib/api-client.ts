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
  PlatformGateway,
  AdminTransaction,
  AdminSmsLog,
  AdminPaymentWallets,
} from "./types/api";
import { METHOD_THEMES } from "./method-theme";

/** Live API only — mock/demo fallbacks are permanently removed. */
export const IS_MOCK = false;
export const DATA_SOURCE = "live" as const;
function resolveApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (raw === "" || raw === "/api/v1") return "";
  return raw;
}
const API_BASE_URL = resolveApiBase();
function usdRate(_code: string): number {
  return 1;
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
  private brandId: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("gresspay_jwt");
      const mode = localStorage.getItem("gresspay_ledger_mode");
      if (mode === "live" || mode === "test") this.ledgerMode = mode;
      this.brandId = localStorage.getItem("gresspay_brand_id");
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("gresspay_jwt", token);
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `gresspay_jwt=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=2592000${secure}`;
    }
  }

  setBrandId(brandId: string | null) {
    this.brandId = brandId;
    if (typeof window !== "undefined") {
      if (brandId) localStorage.setItem("gresspay_brand_id", brandId);
      else localStorage.removeItem("gresspay_brand_id");
      window.dispatchEvent(new Event("gresspay-brand"));
    }
  }

  getBrandId(): string | null {
    return this.brandId;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("gresspay_jwt");
      document.cookie = "gresspay_jwt=; Path=/; SameSite=Lax; Max-Age=0";
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
    if (this.brandId) {
      headers.set("X-GressPay-Brand", this.brandId);
    }
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
        return this.request<{ user: User }>("/api/v1/me");
  }

  async login(email: string, password?: string): Promise<{ token: string; user: User }> {
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
        return this.request<{
      password: boolean;
      google: { enabled: boolean; clientId: string | null };
    }>("/api/v1/auth/providers");
  }

  async getGoogleAuthUrl(redirectUri?: string, signal?: AbortSignal): Promise<{
    enabled: boolean;
    url?: string;
    state?: string;
    reason?: string;
  }> {
        const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : "";
    return this.request<{
      enabled: boolean;
      url?: string;
      state?: string;
      reason?: string;
    }>(`/api/v1/auth/google/url${query}`, { signal });
  }

  async handleGoogleCallback(payload: {
    code: string;
    state: string;
    code_verifier?: string;
  }): Promise<{ token: string; user: User; isNew?: boolean }> {
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
        const res = await this.request<{ token: string; user: User }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async getTransactions(): Promise<{ transactions: Transaction[]; total: number }> {
        return this.request<{ transactions: Transaction[]; total: number }>("/api/v1/transactions");
  }

  async getTransaction(id: string): Promise<Transaction> {
        return this.request<Transaction>(`/api/v1/transactions/${id}`);
  }

  async confirmTransaction(id: string, reason: string): Promise<Transaction> {
        return this.request<Transaction>(`/api/v1/transactions/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async listCompanionDevices(): Promise<{
    devices: {
      deviceId: string;
      label: string;
      status: string;
      lastSeenAt?: string | null;
      online?: boolean;
      onlineWindowSec?: number;
      createdAt?: string;
    }[];
  }> {
        return this.request("/api/v1/companion/devices");
  }

  async registerCompanionDevice(label: string = "Android Companion"): Promise<{
    deviceId: string;
    brandId?: string;
    token: string;
    note: string;
  }> {
    return this.request<{ deviceId: string; brandId?: string; token: string; note: string }>(
      "/api/v1/companion/register",
      {
        method: "POST",
        body: JSON.stringify({ label }),
      }
    );
  }

  async listMerchantSmsLogs(): Promise<{
    smsLogs: {
      id: string;
      sender_key: string;
      amount: number;
      trx_id: string;
      number?: string;
      status: string;
      device_label?: string;
      created_at: string;
    }[];
  }> {
    return this.request<{
      smsLogs: {
        id: string;
        sender_key: string;
        amount: number;
        trx_id: string;
        number?: string;
        status: string;
        device_label?: string;
        created_at: string;
      }[];
    }>("/api/v1/companion/sms-logs");
  }

  async cancelTransaction(id: string, reason?: string): Promise<Transaction> {
    return this.request<Transaction>(
      `/api/v1/transactions/${id}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  }

  async revokeCompanionDevice(deviceId: string): Promise<{ ok: boolean }> {
        return this.request(`/api/v1/companion/devices/${deviceId}/revoke`, { method: "POST", body: "{}" });
  }

  async getBinancePayStatus(): Promise<{
    configured: boolean;
    liveReady: boolean;
    note?: string;
  }> {
        return this.request("/api/v1/merchant/binance-pay");
  }

  async saveBinancePayCredentials(payload: {
    apiKey: string;
    secret: string;
    certificateSn: string;
  }): Promise<{ configured: boolean; liveReady: boolean }> {
        return this.request("/api/v1/merchant/binance-pay", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async clearBinancePayCredentials(): Promise<{ configured: boolean; liveReady: boolean }> {
        return this.request("/api/v1/merchant/binance-pay", {
      method: "PUT",
      body: JSON.stringify({ clear: true }),
    });
  }

  async getPaymentLinks(): Promise<{ links: PaymentLink[] }> {
        return this.request<{ links: PaymentLink[] }>("/api/v1/payment-links");
  }

  async createPaymentLink(payload: Partial<PaymentLink>): Promise<{ link: PaymentLink }> {
        return this.request<{ link: PaymentLink }>("/api/v1/payment-links", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getInvoices(): Promise<{ invoices: Invoice[] }> {
        return this.request<{ invoices: Invoice[] }>("/api/v1/invoices");
  }

  async createInvoice(payload: {
    customer_name: string;
    customer_email: string;
    amount: number;
    currency: string;
    note?: string;
  }): Promise<{ invoice: Invoice }> {
        return this.request<{ invoice: Invoice }>("/api/v1/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getPaymentMethods(): Promise<{ methods: PaymentMethod[] }> {
        const res = await this.request<{ methods: PaymentMethod[] }>("/api/v1/methods");
    return { methods: (res.methods || []).map((m) => hydrateMethod(m)) };
  }

  async updatePaymentMethod(
    code: string,
    isEnabled: boolean,
    options?: { account?: string; depositAddressOrNumber?: string }
  ): Promise<{ method: PaymentMethod; isEnabled: boolean }> {
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
        return this.request(`/api/v1/checkout/${sessionId}/binance/create`, { method: "POST", body: "{}" });
  }

  async getExchangeRates(): Promise<ExchangeRatesResponse> {
        return this.request<ExchangeRatesResponse>("/api/v1/rates");
  }

  async getMetrics(days: 7 | 30 = 7): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>(`/api/v1/dashboard/metrics?days=${days}`);
  }

  async getApiCredentials(): Promise<ApiCredentials> {
        return this.request<ApiCredentials>("/api/v1/merchant/api-keys");
  }

  async getSettings(): Promise<MerchantSettings> {
        return this.request<MerchantSettings>("/api/v1/merchant/settings");
  }

  async updateSettings(payload: {
    businessName?: string;
    brandName?: string;
    brandLogoUrl?: string;
    supportContact?: string;
    receiptFooter?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
    discordWebhookUrl?: string;
    clearTelegramBotToken?: boolean;
    webhookUrl?: string;
    cryptoEnabled?: boolean;
  }): Promise<MerchantSettings> {
    return this.request<MerchantSettings>("/api/v1/merchant/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async testInstantAlert(channel: "telegram" | "discord" | "all" = "all"): Promise<{
    ok: boolean;
    message: string;
    results: Record<string, { ok?: boolean; error?: string; httpCode?: number } | null>;
  }> {
    return this.request("/api/v1/merchant/alerts/test", {
      method: "POST",
      body: JSON.stringify({ channel }),
    });
  }

  async resendTransactionWebhook(id: string): Promise<{ ok: boolean; httpCode?: number; message: string }> {
    return this.request(`/api/v1/transactions/${id}/resend-webhook`, {
      method: "POST",
      body: "{}",
    });
  }

  async getAdminPaymentSettings(): Promise<{ wallets: AdminPaymentWallets }> {
    return this.request<{ wallets: AdminPaymentWallets }>("/api/v1/admin/payment-settings");
  }

  async updateAdminPaymentSettings(wallets: Partial<AdminPaymentWallets>): Promise<{ ok: boolean; wallets: AdminPaymentWallets }> {
    return this.request<{ ok: boolean; wallets: AdminPaymentWallets }>("/api/v1/admin/payment-settings", {
      method: "PUT",
      body: JSON.stringify({ wallets }),
    });
  }

  async rotateApiKey(mode: "live" | "test"): Promise<{
    mode: string;
    key: string;
    prefix?: string;
    created?: boolean;
    note: string;
  }> {
    return this.request("/api/v1/merchant/api-keys/rotate", {
      method: "POST",
      body: JSON.stringify({ mode }),
    });
  }

  async createApiKey(mode: "live" | "test", name?: string): Promise<{
    mode: string;
    key: string;
    prefix?: string;
    created?: boolean;
    note: string;
  }> {
    return this.request("/api/v1/merchant/api-keys/create", {
      method: "POST",
      body: JSON.stringify({ mode, name }),
    });
  }

  async revokeApiKey(keyId: number): Promise<{ ok: boolean; note: string }> {
    return this.request("/api/v1/merchant/api-keys/revoke", {
      method: "POST",
      body: JSON.stringify({ keyId }),
    });
  }

  async rotateWebhookSecret(): Promise<{ webhookSecret: string; note: string }> {
    return this.request<{ webhookSecret: string; note: string }>(
      "/api/v1/merchant/webhook-secret/rotate",
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  async listBrands(): Promise<{
    brands: Array<{
      brandId: string;
      name: string;
      currencyCode?: string;
      timezone?: string;
      webhookUrl?: string | null;
      active: boolean;
      deviceCount: number;
      gatewayCount: number;
      websiteApiKey?: string;
      websiteApiKeyMasked?: string;
    }>;
    activeBrandId: string;
  }> {
    return this.request("/api/v1/brands");
  }

  async createBrand(name: string): Promise<{ brand: { brandId: string; name: string }; token: string }> {
    const res = await this.request<{ brand: { brandId: string; name: string }; token: string }>(
      "/api/v1/brands",
      { method: "POST", body: JSON.stringify({ name }) }
    );
    if (res.token) {
      this.setToken(res.token);
      this.setBrandId(res.brand.brandId);
    }
    return res;
  }

  async switchBrand(brandId: string): Promise<{ brandId: string; name: string; token: string }> {
    const res = await this.request<{ brandId: string; name: string; token: string }>(
      `/api/v1/brands/${brandId}/switch`,
      { method: "POST", body: "{}" }
    );
    if (res.token) {
      this.setToken(res.token);
      this.setBrandId(res.brandId);
    }
    return res;
  }

  async testWebhookPing(): Promise<{ ok: boolean; message: string }> {
        return this.request<{ ok: boolean; message: string }>("/api/v1/webhooks/test-ping", {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  /** Hosted page: init or resume session for link / invoice / chs_* */
  async initCheckout(linkId: string): Promise<CheckoutSession> {
        return this.request<CheckoutSession>(`/api/v1/checkout/${linkId}/init`, {      method: "POST",
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
        return this.request<CheckoutSession>("/api/v1/checkout/create", {      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /** Buyer submits TxID on hosted checkout (public). */
  async verifyCheckout(
    sessionId: string,
    trxId: string,
    method: string,
    gatewayId?: string,
    senderNumber?: string,
    customFields?: Record<string, string>
  ): Promise<CheckoutStatusResponse> {
        return this.request<CheckoutStatusResponse>(`/api/v1/checkout/${sessionId}/verify`, {      method: "POST",
      body: JSON.stringify({
        trx_id: trxId,
        method,
        ...(gatewayId ? { gatewayId } : {}),
        ...(senderNumber ? { sender_number: senderNumber } : {}),
        ...(customFields && Object.keys(customFields).length > 0 ? { customFields } : {}),
      }),
    });
  }

  /** Merchant verify — status by sessionId. */
  async verifyPayment(sessionId: string): Promise<CheckoutStatusResponse> {
        return this.request<CheckoutStatusResponse>("/api/v1/checkout/verify-payment", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
  }

  async getCheckoutStatus(sessionId: string): Promise<CheckoutStatusResponse> {
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
    reason: string,
    setBalance?: number | null
  ): Promise<{ ok: boolean; credits: number }> {
    return this.request<{ ok: boolean; credits: number }>(
      `/api/v1/admin/merchants/${merchantId}/credit`,
      {
        method: "POST",
        body: JSON.stringify({
          delta,
          reason,
          ...(setBalance !== undefined && setBalance !== null ? { set_balance: setBalance } : {}),
        }),
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

  async getAdminPlatformGateways(): Promise<{ gateways: PlatformGateway[] }> {
    return this.request<{ gateways: PlatformGateway[] }>("/api/v1/admin/gateways");
  }

  async toggleAdminPlatformGateway(codeOrId: string): Promise<{ ok: boolean; gateway_code: string; is_enabled: number }> {
    return this.request<{ ok: boolean; gateway_code: string; is_enabled: number }>(
      `/api/v1/admin/gateways/${codeOrId}/toggle`,
      { method: "POST" }
    );
  }

  async updateAdminPlatformGateway(
    codeOrId: string,
    payload: Partial<PlatformGateway>
  ): Promise<{ ok: boolean; gateway: PlatformGateway }> {
    return this.request<{ ok: boolean; gateway: PlatformGateway }>(
      `/api/v1/admin/gateways/${codeOrId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  }

  async updateAdminMerchantRole(
    merchantId: string,
    role: "admin" | "merchant"
  ): Promise<{ ok: boolean; merchantId: string; role: string }> {
    return this.request<{ ok: boolean; merchantId: string; role: string }>(
      `/api/v1/admin/merchants/${merchantId}/role`,
      {
        method: "POST",
        body: JSON.stringify({ role }),
      }
    );
  }

  async updateAdminMerchantPlan(
    merchantId: string,
    planId: string,
    planExpiresAt?: string | null,
    bonusCredits?: number,
    isLifetime?: boolean,
    reason?: string
  ): Promise<{ ok: boolean; merchantId: string; planId: string; planExpiresAt?: string | null; credits?: number }> {
    return this.request<{ ok: boolean; merchantId: string; planId: string; planExpiresAt?: string | null; credits?: number }>(
      `/api/v1/admin/merchants/${merchantId}/plan`,
      {
        method: "POST",
        body: JSON.stringify({
          plan_id: planId,
          plan_expires_at: planExpiresAt,
          bonus_credits: bonusCredits,
          is_lifetime: isLifetime,
          reason,
        }),
      }
    );
  }

  async getAdminTransactions(params?: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<{ transactions: AdminTransaction[]; total: number }> {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return this.request<{ transactions: AdminTransaction[]; total: number }>(
      `/api/v1/admin/transactions${qs ? "?" + qs : ""}`
    );
  }

  async resolveAdminTransaction(
    transactionId: string,
    trxId?: string,
    note?: string
  ): Promise<{ ok: boolean; transaction: AdminTransaction }> {
    return this.request<{ ok: boolean; transaction: AdminTransaction }>(
      `/api/v1/admin/transactions/${transactionId}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({ trx_id: trxId, note }),
      }
    );
  }

  async getAdminSmsLogs(params?: {
    search?: string;
    status?: string;
    limit?: number;
  }): Promise<{ smsLogs: AdminSmsLog[]; total: number }> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return this.request<{ smsLogs: AdminSmsLog[]; total: number }>(
      `/api/v1/admin/sms${qs ? "?" + qs : ""}`
    );  }
}

export const api = new ApiClient();
