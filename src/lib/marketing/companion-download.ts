/** Public GressPay Android APK metadata (marketing + download page). */
export const COMPANION_APK = {
  version: "1.3.2",
  versionLabel: "v1.3.2",
  /** Phone mock / showcase status chip (keep in sync with shipped APK). */
  mockStatusLabel: "Node active",
  androidRange: "Android 8.0–15",
  href: "/download/gresspay.apk",
  fileName: "gresspay.apk",
  /** Bytes; matches public/download/gresspay.apk on main. */
  sizeBytes: 3_364_905,
  sizeLabel: "3.2 MiB",
  sha256:
    "4063692878eca0cb2fa1be7ac2ddfcf7757db60dd41155757d8ee63a104472df",
} as const;

export function companionStatusLine(): string {
  return `${COMPANION_APK.versionLabel} · ${COMPANION_APK.mockStatusLabel}`;
}
