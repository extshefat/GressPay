import Link from "next/link";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { footer, site } from "@/content/marketing";

export function Footer() {
  return (
    <footer className="dark border-t border-border bg-ink-solid py-16 text-xs text-muted">
      <div className="gp-container" data-width="marketing">
        <div className="grid grid-cols-2 gap-8 border-b border-border pb-12 md:grid-cols-5">
          <div className="col-span-2 space-y-4">
            <GressPayLogo variant="white" size="sm" />
            <p className="max-w-sm text-xs leading-relaxed text-muted">{footer.blurb}</p>
            <a href={`mailto:${site.contactEmail}`} className="inline-block text-accent hover:underline">
              {site.contactEmail}
            </a>
          </div>
          {footer.columns.map((column) => (
            <div key={column.title} className="space-y-3">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-on-ink">{column.title}</p>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-accent">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row">
          <p className="font-mono text-[11px] text-muted">© {new Date().getUTCFullYear()} GressPay. English console.</p>
          <div className="flex items-center gap-6 text-[11px]">
            <Link href="/legal/privacy" className="hover:text-on-ink">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-on-ink">
              Terms
            </Link>
            <Link href="/status" className="hover:text-on-ink">
              Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
