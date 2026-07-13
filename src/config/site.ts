// Site-wide toggles.
//
// COMING_SOON gates the entire public site behind a single "under construction"
// placeholder. While `true`:
//   - `/`            renders <ComingSoon> (no GitHub fetch, no real content)
//   - `/now /uses /log` redirect to `/`
// Flip to `false` to reveal the real site. One switch, fully reversible.
// See src/components/ComingSoon.astro.
export const COMING_SOON = false;

// NOINDEX keeps search engines out even when the real site is live — a soft
// launch. While `true`: robots.txt disallows all crawling (and withholds the
// sitemap) and every page carries a `noindex` meta tag. Flip to `false` to
// allow indexing once the imprint/privacy pages are legally reviewed and an
// og.png exists (the two reasons the reveal was held).
export const NOINDEX = true;

// Derived: the site is discoverable by search engines only when it's both
// revealed and index-allowed. Used by robots.txt + the <head> robots meta.
export const INDEXABLE = !COMING_SOON && !NOINDEX;
