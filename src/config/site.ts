// Site-wide toggles.
//
// COMING_SOON gates the entire public site behind a single "under construction"
// placeholder. While `true`:
//   - `/`            renders <ComingSoon> (no GitHub fetch, no real content)
//   - `/now /uses /log` redirect to `/`
//   - `robots.txt`   disallows all crawling and drops the sitemap, so the
//                    unfinished (and not-yet-legally-complete) site isn't indexed
// Flip to `false` to reveal the real site again. One switch, fully reversible.
// See src/components/ComingSoon.astro.
export const COMING_SOON = true;
