/** Public GressPay Android APK metadata (marketing + download page). */
export const COMPANION_APK = {
  version: "1.3.0",
  versionLabel: "v1.3.0",
  /** Phone mock / showcase status chip (keep in sync with shipped APK). */
  mockStatusLabel: "Node active",
  androidRange: "Android 8.0–15",
  href: "/download/gresspay.apk",
  fileName: "gresspay.apk",
  /** Bytes; matches public/download/gresspay.apk on main. */
  sizeBytes: 3_364_901,
  sizeLabel: "3.2 MiB",
  sha256:
    "fc10710815ea1e8d3a36e1461cca5d48a545ae3f3d3eaf2423aa5b5bec325cc5",
} as const;

export function companionStatusLine(): string {
  return `${COMPANION_APK.versionLabel} · ${COMPANION_APK.mockStatusLabel}`;
}
