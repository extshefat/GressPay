import type { Metadata } from "next";
import { MarketingBand, MarketingHeader } from "@/features/marketing/components/MarketingPage";
import { downloadCopy } from "@/content/marketing";
import { COMPANION_APK } from "@/lib/marketing/companion-download";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Download companion APK · GressPay",
  description: downloadCopy.body,
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <MarketingBand bordered={false} className="py-16">
      <MarketingHeader kicker="Android companion" title={downloadCopy.title} description={downloadCopy.body} />
      <article className="gp-surface mx-auto max-w-2xl space-y-5 p-6" data-elevation="raised">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">Version</dt>
            <dd className="mt-1 font-semibold">{COMPANION_APK.versionLabel}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">Size</dt>
            <dd className="mt-1 font-semibold">{COMPANION_APK.sizeLabel}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-muted">SHA-256</dt>
            <dd className="mt-1 break-all font-mono text-xs">{COMPANION_APK.sha256}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-muted">Supports</dt>
            <dd className="mt-1">{COMPANION_APK.androidRange}</dd>
          </div>
        </dl>
        <a href={COMPANION_APK.href} download={COMPANION_APK.fileName}>
          <Button type="button" className="w-full sm:w-auto">
            Download {COMPANION_APK.fileName}
          </Button>
        </a>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {downloadCopy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="text-xs text-muted">
          Signing certificate fingerprint is published with release notes when the APK is rotated. Always verify the SHA-256 above before installing.
        </p>
      </article>
    </MarketingBand>
  );
}
