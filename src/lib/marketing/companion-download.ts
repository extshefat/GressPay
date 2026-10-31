/** Public Companion APK metadata (marketing + download page). */
export const COMPANION_APK = {
  version: "1.2.2",
  versionLabel: "v1.2.2",
  /** Phone mock / showcase status chip (keep in sync with shipped APK). */
  mockStatusLabel: "Node active",
  androidRange: "Android 8.0–15",
  href: "/download/gresspay-companion.apk",
  fileName: "gresspay-companion.apk",
  /** Bytes; matches public/download/gresspay-companion.apk on main. */
  sizeBytes: 11_508_179,
  sizeLabel: "11.0 MB",
  sha256:
    "a12f4f8cc823da67bb01fdb2e49fbe79648ea7ff380877585f824830e7ffacaf",
} as const;

export function companionStatusLine(): string {
  return `${COMPANION_APK.versionLabel} · ${COMPANION_APK.mockStatusLabel}`;
}
