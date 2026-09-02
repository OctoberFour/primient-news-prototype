#!/usr/bin/env python3
"""Apply the news-consolidation prototype changes to a freshly built local copy.

Run build_local_copy.py first (it downloads the pages), then run this. Keeping
the two separate means the prototype can be rebuilt from scratch at any time
instead of relying on hand edits.

Changes applied:
  - "News" in the primary nav becomes a category dropdown
  - the "By Date" month/year filter is replaced by a category filter
  - every overview card gets a category pill and an optional author
  - every article page gets the same pill plus the author's name and title
  - overview cards link to the local article pages
  - prototype.css / category-filter.js are wired in; pages get noindex
"""

import os, re, sys, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
# Working repo: this script is in .context/, the site is in ../primient-news/.
# Handoff package: this script sits beside the site.
_SIBLING = os.path.join(os.path.dirname(HERE), "primient-news")
OUT = _SIBLING if os.path.isdir(_SIBLING) else HERE
# hand-written sources, kept out of the way because build_local_copy.py
# clears the generated files on every run
SRC = os.path.join(HERE, "prototype-assets")

# The single source of truth for the prototype's placeholder data.
# `key` just has to appear in that card's markup on the overview page.
ARTICLES = [
    dict(file="article-impact-report.html",        key="primient-2025-impact-report",
         cat="news",          label="News",          author="Sarah Whitfield", title="Chief Sustainability Officer"),
    dict(file="article-great-place-to-work.html",  key="primient-earns-great-place-to-work",
         cat="press-release", label="Press Release", author=None, title=None),
    dict(file="article-truenorth-collective.html", key="truenorthcollective",
         cat="press-release", label="Press Release", author=None, title=None),
    dict(file="article-lafayette-dayton-safety.html", key="primient-lafayette-and-dayton-plants-earn-cra",
         cat="blog",          label="Blog",          author="Dana Okafor", title="VP of Manufacturing Safety"),
    dict(file="article-ima-centennial.html",       key="ima-recognizes-primient-as-centennial",
         cat="news",          label="News",          author=None, title=None),
    dict(file="article-biosolutions.html",         key="primient-launches-biosolutions-business-unit",
         cat="press-release", label="Press Release", author=None, title=None),
    dict(file="article-cibo-partnership.html",     key="cibo-primient-partnership",
         cat="blog",          label="Blog",          author="Marcus Reyes", title="Director of Regenerative Agriculture"),
]

NAV_DROPDOWN = (
    '<div class="w-dropdown dropdown" data-delay="0" data-hover="true" >\n\n'
    '        <div class="w-dropdown-toggle nav-link dropdown-nav-link w--current current">\n'
    '          <div class="dropdown-nav-link-text">News</div>\n'
    '        </div><nav class="w-dropdown-list dropdown-list">\n\n'
    '    <div class="dropdown-links-wrapper">'
    '<a class="w-dropdown-link dropdown-link" href="index.html">All Articles</a>'
    '<a class="w-dropdown-link dropdown-link" href="index.html?category=press-release">Press Releases</a>'
    '<a class="w-dropdown-link dropdown-link" href="index.html?category=news">News</a>'
    '<a class="w-dropdown-link dropdown-link" href="index.html?category=blog">Blog</a>'
    '</div></nav></div>'
)
OLD_NAV = '<a class="nav-link w-inline-block w--current current" href="https://primient.com/news">News</a>'

CATEGORY_FILTER = """    <div class="amsd-list-right-sidebar">
      <div class="dropdown-label">Category</div>
      <nav class="category-filter" aria-label="Filter articles by category">
        <a href="index.html" class="category-filter-link" data-category="all">All Articles <span class="category-filter-count"></span></a>
        <a href="index.html?category=press-release" class="category-filter-link" data-category="press-release">Press Releases <span class="category-filter-count"></span></a>
        <a href="index.html?category=news" class="category-filter-link" data-category="news">News <span class="category-filter-count"></span></a>
        <a href="index.html?category=blog" class="category-filter-link" data-category="blog">Blog <span class="category-filter-count"></span></a>
      </nav>
    </div>
"""

ROBOTS = ('  <meta name="robots" content="noindex, nofollow">\n'
          '  <!-- Prototype copy of primient.com for design review. Not the live site. -->')


def read(name):
    with open(os.path.join(OUT, name), encoding="utf-8") as f:
        return f.read()


def write(name, s):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(s)


def common(s, css_only=False):
    """Changes every page gets: nav dropdown, prototype stylesheet, noindex."""
    if OLD_NAV in s:
        s = s.replace(OLD_NAV, NAV_DROPDOWN, 1)

    slick = '  <link rel="stylesheet" type="text/css" href="css/slick-theme.css">'
    if 'prototype.css' not in s:
        s = s.replace(slick, slick + '\n  <link rel="stylesheet" type="text/css" href="css/prototype.css">', 1)

    if 'name="robots"' not in s:
        s = s.replace('  <meta charset="utf-8">', '  <meta charset="utf-8">\n' + ROBOTS, 1)
    # a local copy must not claim to be canonical for the real page
    s = re.sub(r'\n\s*<link rel="canonical"[^>]*>', '', s, count=1)
    return s


def pill(a):
    return f'<span class="category-pill category-pill--{a["cat"]}">{a["label"]}</span>'


def build_overview():
    s = read("index.html")
    s = common(s)

    # replace the "By Date" month/year dropdown with the category filter
    start = s.index('    <div class="amsd-list-right-sidebar">')
    end = s.index('</nav>\n      </div>\n    </div>\n', start) + len('</nav>\n      </div>\n    </div>\n')
    assert 'By Date' in s[start:end], "By Date block not where expected"
    s = s[:start] + CATEGORY_FILTER + s[end:]

    cards = list(re.finditer(r'<div class="amsd-item hover-effect-3d w-inline-block[^"]*">.*?\n        </div>', s, re.S))
    assert len(cards) == len(ARTICLES), f"expected {len(ARTICLES)} cards, found {len(cards)}"

    out, last = [], 0
    for card, a in zip(cards, ARTICLES):
        block = card.group(0)
        assert a["key"] in block, f"card order mismatch: {a['key']}"

        block = block.replace('<div class="amsd-item hover-effect-3d',
                              f'<div data-category="{a["cat"]}" class="amsd-item hover-effect-3d', 1)

        byline = f'<span class="article-author">{a["author"]}</span>' if a["author"] else ''
        meta = f'            <div class="article-meta-row">{pill(a)}{byline}</div>\n'
        m = re.search(r' *<p class="amsd-meta-text news-author">', block)
        block = block[:m.start()] + meta + block[m.start():]

        # point the card at the local article page
        block = re.sub(r'https://primient\.com/news/article/[^"]*', a["file"], block)

        out.append(s[last:card.start()] + block)
        last = card.end()
    out.append(s[last:])
    s = "".join(out)

    if 'category-filter.js' not in s:
        s = s.replace('</body>', '  <script src="js/category-filter.js"></script>\n</body>', 1)

    write("index.html", s)
    return s


def build_article(a):
    s = read(a["file"])
    s = common(s)

    if 'article-meta-row' not in s:
        m = re.search(r' *<p class="amsd-meta-text news-author profile">', s)
        assert m, f'{a["file"]}: published-date line not found'
        author = ''
        if a["author"]:
            author = (f'<span class="article-author">{a["author"]}'
                      f'<span class="article-author-title">, {a["title"]}</span></span>')
        indent = ' ' * (m.start() - s.rfind('\n', 0, m.start()) - 1)
        s = s[:m.start()] + f'{indent}<div class="article-meta-row profile">{pill(a)}{author}</div>\n' + s[m.start():]

    # keep in-article links to the six other local articles working
    for other in ARTICLES:
        s = re.sub(r'https://primient\.com/news/article/\d{4}/\d{2}/' + re.escape(other["key"]) + r'[^"]*',
                   other["file"], s)

    write(a["file"], s)


def main():
    missing = [a["file"] for a in ARTICLES if not os.path.exists(os.path.join(OUT, a["file"]))]
    if missing:
        sys.exit("Missing pages (run build_local_copy.py first): " + ", ".join(missing))

    for src, dst in [("prototype.css", "css/prototype.css"),
                     ("category-filter.js", "js/category-filter.js"),
                     ("README.md", "README.md"),
                     ("HANDOFF.md", "HANDOFF.md")]:
        shutil.copyfile(os.path.join(SRC, src), os.path.join(OUT, dst))
    print("copied prototype.css, category-filter.js, README.md, HANDOFF.md")

    build_overview()
    print("index.html            -> nav dropdown, category filter, 7 pills, local article links")
    for a in ARTICLES:
        build_article(a)
        who = a["author"] or "no author"
        print(f'{a["file"]:<38} -> {a["label"]} pill, {who}')

    # the first published link was article.html; keep it working
    target = ARTICLES[0]["file"]
    write("article.html",
          '<!DOCTYPE html>\n<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">\n'
          f'<title>Redirecting…</title>\n<meta http-equiv="refresh" content="0; url={target}">\n'
          f'<link rel="canonical" href="{target}">\n'
          f'<p>Redirecting to <a href="{target}">{target}</a>.</p>\n')
    print(f"article.html          -> redirect to {target}")


if __name__ == "__main__":
    main()
