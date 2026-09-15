# Primient News — consolidation prototype

A working prototype of the requested news changes, built on a local copy of
<https://primient.com/news> captured 15 September 2026.

**Live version:** <https://octoberfour.github.io/primient-news-prototype/>

For implementation notes — what a developer needs to build this for real — see
[HANDOFF.md](HANDOFF.md).

## How to open it locally

The filtering reads the URL, so serve the folder rather than double-clicking the
file. In Terminal:

```
cd primient-news
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Press `Ctrl+C` to stop.

## What to try

| | |
| --- | --- |
| Hover **NEWS** in the top nav | Dropdown with All Articles / Press Releases / News / Blog |
| Pick one | Loads the overview already filtered to that category |
| Click the sidebar filters | Filters instantly, no page reload; back button works |
| Click any card | Opens that article page, showing the same pill and byline |

Direct links also work: `?category=press-release`, `?category=news`, `?category=blog`.

## What changed

**One consolidated overview.** `index.html` is the single master listing.

**Category filtering replaces date sorting.** The "By Date" month/year dropdown
is gone. In its place is a category list in the sidebar, with a live count next
to each. Every article carries a `data-category` attribute.

**Categories in the primary nav.** "News" is now a dropdown built from the same
markup as the existing About / Sustainability / Contact dropdowns, so it inherits
their styling and behaviour. Each item deep-links to a pre-filtered view.

**Category pills.** Every card and every article page shows a pill. Colours come
from the existing brand palette and each pairing meets WCAG AA contrast:

| Category | Background | Text | Contrast |
| --- | --- | --- | --- |
| Press Release | `--brand-blue` `#243d3a` | white | 12.6:1 |
| News | `--green` `#37aa31` | `#0c2a0a` | 5.2:1 |
| Blog | `--yellow` `#f2e711` | `--brand-blue` | 12.0:1 |

**Optional author.** Where an author exists, the name shows next to the pill on
the card, and name + title on the article page. Articles without an author simply
omit it — see the press releases.

**Author block at the foot of the article.** News and blog articles with an
author close with a block carrying the headshot, name, title, a short bio and
social links. It reuses the leadership page's own classes — the circular `staff`
photo, `member-item-heading` / `member-item-sub-heading`, and the footer social
icon — so it reads as part of the existing design system.

Every part is independently optional: no author means no block at all, and an
author with no headshot, no bio or no social links just drops that piece. The
three authors deliberately differ — three social links, two, and two — to show
that.

**Filtered-view tidy-up.** The newest article normally runs full width. In a
filtered view that lone wide card looked out of place, so all cards drop to the
uniform half-width treatment. Compare "All Articles" with "News" to see it.

## The pages

All seven articles exist as their own page, each carrying its pill and byline.
The three with an author also carry the author block.

| File | Category | Author | Author block |
| --- | --- | --- | --- |
| `index.html` | — | the overview | — |
| `article-chicago-bears.html` | Press Release | — | — |
| `article-impact-report.html` | News | Sarah Whitfield | photo, bio, 3 links |
| `article-great-place-to-work.html` | Press Release | — | — |
| `article-truenorth-collective.html` | Blog | Marcus Reyes | photo, bio, 2 links |
| `article-lafayette-dayton-safety.html` | Blog | Dana Okafor | photo, bio, 2 links |
| `article-ima-centennial.html` | News | — | — |
| `article-biosolutions.html` | Press Release | — | — |

`article.html` is a redirect to the Impact Report, kept so an earlier shared
link still works.

## Where the new code lives

All additions are isolated in two files. **No original site stylesheet was
edited.**

| File | Purpose |
| --- | --- |
| `css/prototype.css` | Pills, byline, category filter, filtered-grid tidy-up, author block. Five commented sections. |
| `js/category-filter.js` | The filtering. The `CATEGORIES` list at the top is the one place to add or rename one. |

## Placeholder content — needs real data

Invented to demonstrate the design. **Not** real Primient data:

- **Category names.** Press Release / News / Blog, from the brief. Still TBD.
- **Which article is in which category.** Assigned by eye to give each category
  a couple of entries.
- **Author names, titles and bios.** Sarah Whitfield (Chief Sustainability
  Officer), Dana Okafor (VP of Manufacturing Safety) and Marcus Reyes (Director
  of Regenerative Agriculture) are made up, as are their bio paragraphs.
- **Headshots.** All three use `images/staff-placeholder.jpg`, which is
  Primient's own placeholder avatar — real headshots are needed.
- **Social links.** All point at `#`. They go nowhere on purpose, since the
  people are not real.

All three live in one place: the `ARTICLES` list at the top of
`apply_prototype.py`.

## Rebuilding

The prototype is reproducible, not hand-edited. Two steps:

```
python3 build_local_copy.py    # re-downloads the 8 pages from primient.com
python3 apply_prototype.py     # re-applies every change described above
```

The first step **clears the site folder**, so the hand-written sources
(`prototype.css`, `category-filter.js`, and this README) live in
`prototype-assets/` and are copied back in by the second step.

## Notes on the local copy

- Analytics and Tag Manager were stripped so it doesn't send tracking data.
- Both pages carry `noindex, nofollow`, and the `canonical` tag pointing at the
  real primient.com was removed, so this copy can't be confused for the live site.
- A faint overlay flashes on load — that's the site's own page-loader fading out.

## A note on the live site moving

This copy is a snapshot. Between the first capture on 1 September and this one,
Primient published the Chicago Bears partnership article and **added pagination
to the live news page**, which pushed the CIBO article to page two — so it is no
longer in this prototype. Re-running the two build steps re-syncs to whatever is
live, but the `ARTICLES` list in `apply_prototype.py` has to match the cards on
page one, in order, or the script will stop and tell you so.
