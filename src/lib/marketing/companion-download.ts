/** Public Companion APK metadata (marketing + download page). */
export const COMPANION_APK = {
  version: "1.2.1",
  versionLabel: "v1.2.1",
  /** Phone mock / showcase status chip (keep in sync with shipped APK). */
  mockStatusLabel: "Node active",
  androidRange: "Android 8.0–15",
  href: "/download/gresspay-companion.apk",
  fileName: "gresspay-companion.apk",
  /** Bytes; matches public/download/gresspay-companion.apk on main. */
  sizeBytes: 11_508_183,
  sizeLabel: "11.0 MB",
  sha256:
    "98dceea88a2238574685d19ba977372922ca986ddc282a7d4d63825933b78a5b",
} as const;

export function companionStatusLine(): string {
  return `${COMPANION_APK.versionLabel} · ${COMPANION_APK.mockStatusLabel}`;
}
