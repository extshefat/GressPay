# Earth illustration

InteractiveGlobe and its SSR/static SVG fallback use dotted land sampled from the
existing `earth-land.png` in this repository. Its prior source comment attributes
the mask to Natural Earth (public domain); an original download record was not
bundled. Natural Earth's terms: https://www.naturalearthdata.com/about/terms-of-use/.
The mask itself is unchanged by this phase.

All arcs are illustrative geographical connections. They are not live payments,
coverage claims, transaction counts or customer locations. The visible caption
must retain that distinction wherever the object appears. No WebGL dependency.

Animation pauses off-screen and while the document is hidden. Reduced motion,
save-data, <=4-core devices and unavailable canvas use the static dotted SVG.
Explicit keyboard-operable rotation controls also work with that static fallback.
