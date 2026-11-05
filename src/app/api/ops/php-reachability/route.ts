import { NextResponse } from "next/server";
import { phpOriginCandidates, primaryPhpOrigin, probePhpOrigins } from "@/lib/php-upstream";

/**
 * Operator diagnostic: which internal PHP hosts the web container can reach.
 * No secrets. Safe to hit from Coolify web terminal or briefly from browser.
 */
export async function GET() {
  const probes = await probePhpOrigins(3000);
  const reachable = probes.filter((p) => p.ok);
  return NextResponse.json(
    {
      ok: reachable.length > 0,
      preferred: primaryPhpOrigin(),
      candidates: phpOriginCandidates(),
      envSet: Boolean((process.env.GRESSPAY_PHP_URL || "").trim()),
      probes,
      hint:
        reachable.length > 0
          ? "At least one PHP origin responded. Google login should work if GOOGLE_* is set on php."
          : "No PHP origin responded. In Coolify open the php container logs, confirm it is Running, set web GRESSPAY_PHP_URL=http://php:8080, Redeploy.",
    },
    { status: reachable.length > 0 ? 200 : 503 }
  );
}
