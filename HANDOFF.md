# Handoff notes

For the developer implementing this in the Cybernautic CMS. The prototype is a
static design reference, not production code — it shows the intended behaviour
and visual treatment. See [README.md](README.md) for how to run it.

## The brief, and where each point landed

| Requirement | In the prototype |
| --- | --- |
| Consolidate news into a single master page | `index.html` is the one listing |
| Content organised into categories (Press Release, News, Blog, etc.) | `data-category` on each card; pill on card and article |
| Category assignment in Editor at create/edit time | Not modelled — a CMS field |
| Primient can add/change categories | Category list is data-driven, one entry per category |
| Remove date-based month/year sorting | The "By Date" dropdown is deleted |
| Replace with category-based filtering on overview | Sidebar filter + `?category=` deep links |
| Major categories as a nav dropdown, pre-filtered on load | "News" nav dropdown, each item deep-links |
| Optional author name and title on article records | Byline next to the pill; absent on press releases |
| Pill on cards and article pages, author alongside | Both, on all seven articles |

## What the CMS needs

**On the article record:**

| Field | Type | Notes |
| --- | --- | --- |
| `category` | reference to a category record | Required. Set in Editor on create/edit. |
| `author_name` | text | **Optional** — press releases publish without it |
| `author_title` | text | Optional; shown after the name on the article page only |

**A category record**, so Primient can add and rename without a developer:

| Field | Type | Notes |
| --- | --- | --- |
| `title` | text | Display name, e.g. "Press Release" |
| `slug` | text | Used in `?category=` and the pill's CSS class |
| `pill_background` / `pill_text` | colour | Optional. Lets Editor set pill colours; otherwise hard-code per slug. |

Renaming a category should not break existing links — key the filter on `slug`
and keep slugs stable when the display name changes.

### Worth checking first

The page JSON the CMS already emits (`<script id="pjax-page-json">` on the live
news page) contains `"authors": []`, `"categories": []` and
`"subcategories": ["author"]`. Some of this scaffolding may already exist in the
platform, which could make the build cheaper than expected. Worth confirming
before specifying new fields.

## Behaviour worth preserving

- **Filtering does not reload the page.** It toggles card visibility and uses
  `pushState`, so the back button steps through filters. If you implement it
  server-side instead, that's fine — but keep `?category=` as the URL contract,
  because the nav dropdown depends on it.
- **`?category=` is the deep link.** An unknown or missing value falls back to
  "all" rather than erroring.
- **Counts next to each filter** are computed, not authored.
- **The nav dropdown** reuses the existing `w-dropdown` markup from About /
  Sustainability / Contact — no new nav component was introduced.

## Design decisions to confirm with the designer

1. **Filtered-view card sizing.** The newest article normally runs full width.
   In a filtered view all cards drop to uniform half-width, because one lone wide
   card looked wrong. Four lines in `prototype.css` §4 if you want it reverted.
2. **Pill colours.** Brand palette, each meeting WCAG AA. If categories multiply
   beyond three or four, this needs a colour system rather than one-off pairings.
3. **Author on the card vs the article.** Card shows name only; the article page
   shows name + title. The brief said "author name will display alongside it" on
   both, so the title on the article page is an addition — confirm it's wanted.
4. **Category names are still TBD** per the brief's PM note.

## Not addressed

Out of scope for this prototype, but likely needed in the real build:

- **Pagination / load-more.** Only seven articles exist here, so the full list
  fits on one page. The real archive is much larger and the old date filter was
  partly doing this job — removing it makes pagination more important, not less.
- **Filtering more than one category at once**, if that's ever wanted.
- **Empty state.** `prototype.css` styles a `.category-filter-empty` message, but
  no category is currently empty so it never shows.
- **Mobile filter layout** is a reasonable default (filters wrap into a row above
  the list) but has not been design-reviewed.
- **Redirects.** Any existing `/news/archive/YYYY/MM` URLs will 404 once date
  archives are removed. They should redirect to the overview.

## Placeholder data

Author names, author titles, and which article sits in which category are all
invented. They exist to demonstrate the design and must be replaced. All of it
is in the `ARTICLES` list at the top of `apply_prototype.py`.
