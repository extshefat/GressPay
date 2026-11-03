/** Public GressPay Android APK metadata (marketing + download page). */
export const COMPANION_APK = {
  version: "1.3.1",
  versionLabel: "v1.3.1",
  /** Phone mock / showcase status chip (keep in sync with shipped APK). */
  mockStatusLabel: "Node active",
  androidRange: "Android 8.0–15",
  href: "/download/gresspay.apk",
  fileName: "gresspay.apk",
  /** Bytes; matches public/download/gresspay.apk on main. */
  sizeBytes: 3_364_901,
  sizeLabel: "3.2 MiB",
  sha256:
    "3a44f0fbf6d14026ae1b2381957b0bfe6c2081c1afd30103f2ad9182b56751cf",
} as const;

export function companionStatusLine(): string {
  return `${COMPANION_APK.versionLabel} · ${COMPANION_APK.mockStatusLabel}`;
}
