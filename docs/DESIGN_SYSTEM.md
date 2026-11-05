# Phase 3: design foundations

Branch: `phase-3-design-system`. Page information architecture is unchanged.

## Sources and decisions

The supplied textured lockup's dominant solid pixel samples are teal `#077C73`,
mint `#1BD1C0`, and wordmark ink `#081525`. Semantic action/link shades differ from
these samples where needed for contrast. Provider logos remain original assets.
The inline SVG mark traces the supplied silhouette; the wordmark uses the local
UI typeface. Monochrome variants inherit currentColor.

Figtree is the UI face; Bricolage Grotesque is the marketing display face;
JetBrains Mono handles identifiers. Noto Sans Bengali supplies shaped Bengali
and the taka glyph. All four variable WOFF2 derivatives, OFL licenses, source
URLs and checksums are in `public/fonts`. Fonts were checked visually in Chromium;
Latin remains restrained while Bengali gets body line height 1.6. Build-time font
network access is unnecessary.

Canonical frontend colors live in `src/app/globals.css` and
`src/lib/design/tokens.ts`. Tailwind exposes semantic roles; white/black utility
aliases remain for existing page compatibility and resolve to tinted paper/ink.
Old provider palette exports and component variants remain compatible. Provider
foregrounds were adjusted where a white label lacked contrast.

Four elevations share tinted ambient, key and contact shadows and an inset top
highlight. Controls use 10px corners, cards 14px, and large surfaces 20px. The
canvas has a 3.5% dot texture. Perspective is available through Tilt3D for
showcases; dashboard components do not use it. Native dialog supplies top-layer
semantics, with an explicit keyboard focus loop, Escape handling, focus return,
and reference-counted scroll locks for stacked overlays.

Theme boot defaults to the operating system, follows system changes, and stores
an explicit user preference. The exact boot source remains shared with the CSP
hash. Framer Motion receives the user's reduced-motion preference; CSS and
pointer depth also respect it. Walkthrough playback now starts paused.

The globe uses actual land samples from the inherited Earth texture, a static
server-rendered SVG, and an optional 2D canvas animation. It pauses off-screen
and in hidden tabs. Reduced motion, data saving and low CPU concurrency use the
static rendering. Connections are illustrative; see `public/brand/EARTH.md`.

## Internal review

`/design-system` renders light and dark specimens of the primitives, keyboard
controls, error/loading/disabled states, explicit fixed fixtures and empty data.
It is noindex. Production access and SSR fallback regressions are exercised by
`scripts/check-design-access.mjs` in CI. Development permits access; production requires a session whose
PHP `/api/v1/me` response identifies a verified platform admin. Missing sessions,
non-admins, and unavailable authentication fail closed with 404.

## Verification

Run `npm run check:design`, `npx --no-install tsc --noEmit`, and `npm run build`.
The build also rejects raw frontend hex literals outside the token files and
legacy void/cyanGlow/emerald-glow utilities. Contrast checks exercise both themes'
text roles against canvas/surface/card at 4.5:1 and input borders at 3:1.
Formatter contracts cover taka, Bengali digits, invalid values and Dhaka time;
boot tests cover system preference and explicit overrides.

Chromium review covered local font loading, both specimens, widths 320/640/1440/
1920, modal Tab containment/Escape/focus return/scroll unlock, menu arrows/Escape,
roving tabs, persisted theme choice, and disabled tilt/globe animation under
reduced motion. The showcase had no browser console errors. The marketing page
also loaded, but its account request returned 502 because PHP is not running in
this workspace; authenticated business workflows require the deployed API.

Production session/proxy/CSP checks passed, along with anonymous/member/
unverified-admin denial and verified-admin access using an isolated upstream
fixture. Real admin authentication still depends on PHP.

The workspace's existing node_modules contains Next 15.1.0 although the manifest
and lockfile specify 15.5.29. No dependencies were installed. CI or an authorized
managed environment must repeat checks after `npm ci` to validate that exact
locked version. This is not a full screen-reader/device audit, nor a contrast
certification for merchant-supplied checkout colors.
