# Primient News — consolidation prototype

A working prototype of the requested news changes, built on a local copy of
<https://primient.com/news> (captured 2026-09-01).

## How to open it

Because the filtering reads the URL, open it through a small local web server
rather than double-clicking the file. In Terminal:

```
cd primient-news
python3 -m http.server 8000
```

Then visit <http://localhost:8000> in your browser. Press `Ctrl+C` in Terminal
to stop it.

## What to try

| | |
| --- | --- |
| Hover **NEWS** in the top nav | Dropdown with All Articles / Press Releases / News / Blog |
| Pick one | Loads the overview already filtered to that category |
| Click the sidebar filters | Filters instantly, no page reload; back button works |
| Click the Impact Report card | Opens the article page, showing the pill and byline |

Direct links also work: `?category=press-release`, `?category=news`, `?category=blog`.

## What changed

**One consolidated overview.** `index.html` is the single master listing.

**Category filtering replaces date sorting.** The "By Date" month/year dropdown
is gone. In its place is a category list in the sidebar, with a live count next
to each. Every article carries a `data-category` attribute.

**Categories in the primary nav.** "News" is now a dropdown built from the same
markup as the existing About / Sustainability / Contact dropdowns, so it inherits
their styling and behaviour. Each item deep-links to a pre-filtered view.

**Category pills.** Every card shows a pill. Colours come from the existing brand
palette and each one meets WCAG AA contrast:

| Category | Background | Text |
| --- | --- | --- |
| Press Release | `--brand-blue` `#243d3a` | white |
| News | `--green` `#37aa31` | `#0c2a0a` |
| Blog | `--yellow` `#f2e711` | `--brand-blue` |

**Optional author.** Where an author exists, the name shows next to the pill on
the card, and name + title on the article page. Cards without an author simply
omit it — see the press releases.

**Filtered-view tidy-up.** The newest article normally runs full width. In a
filtered view that lone wide card looked out of place, so all cards drop to the
uniform half-width treatment. Compare "All Articles" with "News" to see it.

## Where the new code lives

All additions are isolated in two new files. **No original site file was
restyled** — the existing stylesheets are untouched.

| File | Purpose |
| --- | --- |
| `css/prototype.css` | Pills, byline, category filter, filtered-grid tidy-up. Commented in four numbered sections. |
| `js/category-filter.js` | The filtering itself. The `CATEGORIES` list at the top is the single place to add or rename one. |

`index.html` and `article.html` were edited in place to add the nav dropdown,
the sidebar filter, and the pill/byline markup on each card.

### Adding or renaming a category

1. Add it to `CATEGORIES` in `js/category-filter.js`
2. Add a `.category-pill--your-slug` colour block in `css/prototype.css`
3. Add a link to the nav dropdown and the sidebar list in `index.html`

## Placeholder content — needs real data

These were invented to demonstrate the design and are **not** real Primient data:

- **Category names.** Used Press Release / News / Blog from the brief. Marked TBD.
- **Which article is in which category.** Assigned by eye to give each category
  a couple of entries.
- **Author names and titles.** Sarah Whitfield (Chief Sustainability Officer),
  Dana Okafor (VP of Manufacturing Safety), Marcus Reyes (Director of
  Regenerative Agriculture) are made up.

## Notes on the local copy

- Analytics and Tag Manager were stripped so it doesn't send tracking data.
- Only the Impact Report article exists locally. Other "Learn More" links go to
  the live site.
- A faint overlay flashes on load — that's the site's own page-loader fading out.

Re-pull a clean copy of the live pages any time with
`python3 build_local_copy.py` — note this **overwrites** the folder
and discards the prototype changes.
