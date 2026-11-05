# Self-hosted font assets

Derived, subset variable WOFF2 fonts from Google Fonts' official `ofl` sources:
Figtree (UI), Bricolage Grotesque (display), JetBrains Mono (code), Noto Sans Bengali
(Bengali fallback, including U+09F3 ৳). Each source OFL license is retained beside
its asset. Source and output SHA-256 digests are in manifest.json.

The modified font families are renamed GressPay UI/Display/Mono/Bengali to respect
reserved font names. Original copyright records are retained. These are licensed
derivatives, not fonts originally designed by GressPay. Coverage retains Latin,
Bengali, joining controls, punctuation and currency glyphs present in each source;
OpenType shaping and variable axes are retained. Bengali is the explicit fallback
for both UI and mono. No build-time download or extra application package is used.

Generated with the already available FontTools subsetter and system Brotli library.
