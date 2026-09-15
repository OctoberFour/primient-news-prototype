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
| Author info at the foot of news/blog profiles | Block with headshot, name, title, bio and social links |

## What the CMS needs

**On the article record:**

| Field | Type | Notes |
| --- | --- | --- |
| `category` | reference to a category record | Required. Set in Editor on create/edit. |
| `author` | reference to an author record | **Optional** — press releases publish without one |

Author is better as its own record than as loose fields on the article, because
the same person writes repeatedly and their headshot and bio should not be
re-entered and re-edited per article.

**An author record:**

| Field | Type | Notes |
| --- | --- | --- |
| `name` | text | Required. Used in the byline and the author block. |
| `title` | text | Optional. Job title. |
| `headshot` | image | Optional. Square crop; displayed as a circle. |
| `bio` | rich text or textarea | Optional. Two or three sentences. |
| `social_links` | repeatable (platform, url) | Optional, zero or more |

Everything except `name` is optional and independently so. The prototype shows
this: three authors with different numbers of social links, four articles with
no author at all and therefore no block.

If a separate author record is too much for this phase, the fallback is
`author_name` / `author_title` / `author_headshot` / `author_bio` directly on the
article, accepting the duplication.

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
   shows name + title in the byline, then the full block at the foot. The brief
   said "author name will display alongside it" on both, so the title in the
   article byline is an addition — confirm it's wanted.
4. **Author block sizing.** The leadership page renders the name at 48px and the
   job title at 30px, which is the same size as the article's own headline. The
   block scales these to 24px / 15px so the author does not compete with the
   article title, and the circular headshot from 200px to 140px. Both are in
   `prototype.css` §5.
5. **Social platforms.** LinkedIn, X and email are shown. Confirm the real set —
   the site footer uses LinkedIn, Facebook and Instagram.
6. **Author block placement.** It sits below the article body and above "Back To
   News". Confirm that, rather than in a sidebar or directly under the byline.
7. **Category names are still TBD** per the brief's PM note.

## Not addressed

Out of scope for this prototype, but likely needed in the real build:

- **Pagination.** Primient added pagination to the live news page (via
  `jquery.simplePagination`) between 1 and 15 September 2026, so this is now
  solved on the real site — but it interacts with category filtering and that
  interaction is **not** designed. Decide explicitly: does choosing a category
  re-paginate the filtered set server-side, or does the filter only apply to the
  current page? The second is what a naive client-side implementation gives you,
  and it is wrong — a reader on "Blog" would see only the blog posts that happen
  to fall on page one. The prototype sidesteps this by holding all seven articles
  on a single page.
- **Filtering more than one category at once**, if that's ever wanted.
- **Empty state.** `prototype.css` styles a `.category-filter-empty` message, but
  no category is currently empty so it never shows.
- **Mobile filter layout** is a reasonable default (filters wrap into a row above
  the list) but has not been design-reviewed.
- **Redirects.** Any existing `/news/archive/YYYY/MM` URLs will 404 once date
  archives are removed. They should redirect to the overview.

## Placeholder data

Author names, titles, bios, and which article sits in which category are all
invented, and every headshot is Primient's own `staff-placeholder.jpg`. Social
links point at `#` deliberately, since the people are not real. All of it is in
the `ARTICLES` list at the top of `apply_prototype.py`.
