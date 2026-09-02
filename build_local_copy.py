#!/usr/bin/env python3
"""Build a tidy, self-contained local copy of https://primient.com/news for prototyping."""

import os, re, sys, glob, urllib.request, urllib.parse, hashlib, shutil


def resolve_out():
    """Where the site lives.

    Working repo: this script is in .context/, the site is in ../primient-news/.
    Handoff package: this script sits beside the site it builds.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    sibling = os.path.join(os.path.dirname(here), "primient-news")
    return sibling if os.path.isdir(sibling) else here

PAGE = "https://primient.com/news"
A = "https://primient.com/news/article/"
PAGES = [
    ("https://primient.com/news", "index.html"),
    (A + "2026/07/primient-2025-impact-report", "article-impact-report.html"),
    (A + "2026/06/primient-earns-great-place-to-work-certification-across-the-u-s-poland-and-brazil",
        "article-great-place-to-work.html"),
    (A + "2026/06/truenorthcollective", "article-truenorth-collective.html"),
    (A + "2026/06/primient-lafayette-and-dayton-plants-earn-cra-safety-awards",
        "article-lafayette-dayton-safety.html"),
    (A + "2026/04/ima-recognizes-primient-as-centennial-manufacturer-1", "article-ima-centennial.html"),
    (A + "2026/04/primient-launches-biosolutions-business-unit", "article-biosolutions.html"),
    (A + "2026/03/cibo-primient-partnership", "article-cibo-partnership.html"),
]
OUT = resolve_out()
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

EXT_DIR = {
    ".css": "css", ".js": "js",
    ".woff": "fonts", ".woff2": "fonts", ".ttf": "fonts", ".eot": "fonts", ".otf": "fonts",
}
IMG_EXT = {".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico", ".avif"}

cache = {}       # absolute url -> local path relative to OUT
by_content = {}  # content hash -> local path, so cache-buster variants share one file
failed = []


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": PAGE})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read(), r.headers.get("Content-Type", "")


def local_name(url, ctype):
    """Pick a clean folder + filename for an asset URL."""
    path = urllib.parse.urlparse(url).path
    base = urllib.parse.unquote(os.path.basename(path)) or "asset"
    ext = os.path.splitext(base)[1].lower()

    # trust Content-Type over the URL extension (the site serves .scss as text/css)
    ct = ctype.split(";")[0].strip().lower()
    if ct == "text/css" and ext != ".css":
        base, ext = os.path.splitext(base)[0] + ".css", ".css"

    if not ext:  # e.g. /image/238/600 -> derive from Content-Type
        ct = ctype.split(";")[0].strip()
        ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/svg+xml": ".svg",
               "image/gif": ".gif", "image/webp": ".webp", "text/css": ".css",
               "application/javascript": ".js", "text/javascript": ".js"}.get(ct, ".bin")
        # /image/238/600 -> image-238-600.jpg
        base = "-".join(p for p in path.strip("/").split("/") if p) + ext

    folder = EXT_DIR.get(ext, "images" if ext in IMG_EXT else "assets")
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base)

    dest = os.path.join(folder, base)
    # de-duplicate distinct URLs that share a basename
    if any(v == dest for v in cache.values()):
        stem, e = os.path.splitext(base)
        dest = os.path.join(folder, f"{stem}-{hashlib.md5(url.encode()).hexdigest()[:6]}{e}")
    return dest


def rel(from_file, to_file):
    return os.path.relpath(to_file, os.path.dirname(from_file)).replace(os.sep, "/")


def grab(url, base_url):
    """Download url (resolved against base_url); return local path relative to OUT."""
    abs_url = urllib.parse.urljoin(base_url, url)
    if abs_url.startswith("//"):
        abs_url = "https:" + abs_url
    if not abs_url.startswith(("http://", "https://")):
        return None
    key = abs_url.split("#")[0]
    if key in cache:
        return cache[key]
    # percent-encode spaces and other stray characters in the path
    _p = urllib.parse.urlsplit(key)
    key = urllib.parse.urlunsplit(_p._replace(path=urllib.parse.quote(_p.path, safe="/%@:+,;=$&()!*'")))
    if key in cache:
        return cache[key]

    try:
        data, ctype = fetch(key)
    except Exception as e:
        failed.append((key, str(e)))
        return None

    # the site serves the same stylesheet under many ?m=... values; keep one copy
    digest = hashlib.md5(data).hexdigest()
    if digest in by_content:
        cache[key] = by_content[digest]
        return cache[key]

    dest = local_name(key, ctype)
    cache[key] = dest
    by_content[digest] = dest
    full = os.path.join(OUT, dest)
    os.makedirs(os.path.dirname(full), exist_ok=True)

    if dest.endswith(".css"):
        data = rewrite_css(data.decode("utf-8", "replace"), key, dest).encode("utf-8")

    with open(full, "wb") as f:
        f.write(data)
    print(f"  {dest:<52} <- {key}")
    return dest


CSS_URL = re.compile(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)""")
# bare-string form only; the `@import url(...)` form is handled by CSS_URL below
CSS_IMPORT = re.compile(r"""@import\s+(['"])([^'"]+)\1""")


def rewrite_css(text, css_url, css_dest):
    def sub_url(m):
        q, target = m.group(1), m.group(2).strip()
        if target.startswith(("data:", "#")):
            return m.group(0)
        got = grab(target, css_url)
        return m.group(0) if not got else f"url({q}{rel(css_dest, got)}{q})"

    def sub_import(m):
        got = grab(m.group(2), css_url)
        return m.group(0) if not got else f'@import "{rel(css_dest, got)}"'

    return CSS_URL.sub(sub_url, CSS_IMPORT.sub(sub_import, text))


def build_page(page_url, index):
    print(f"\nFetching {page_url} -> {index}")
    html = fetch(page_url)[0].decode("utf-8", "replace")
    PAGE = page_url

    # --- strip analytics / tag-manager so the local copy doesn't phone home ---
    html = re.sub(r'<script[^>]*googletagmanager\.com[^>]*>\s*</script>', "", html, flags=re.I)
    html = re.sub(r'<script[^>]*src="/modules/seo/analytics[^"]*"[^>]*>\s*</script>', "", html, flags=re.I)
    html = re.sub(r'<noscript>\s*<iframe[^>]*googletagmanager[^>]*>.*?</iframe>\s*</noscript>',
                  "", html, flags=re.I | re.S)
    html = re.sub(r"<script\b[^>]*>(?:(?!</script>).)*?(?:gtag\(|dataLayer|GTM-)(?:(?!</script>).)*?</script>",
                  "", html, flags=re.I | re.S)

    print("Downloading assets...")

    # <link href> stylesheets + icons, <script src>, <img src>
    def sub_attr(m):
        attr, q, val = m.group(1), m.group(2), m.group(3)
        if val.startswith(("data:", "#", "mailto:", "tel:", "javascript:")):
            return m.group(0)
        got = grab(val, PAGE)
        return m.group(0) if not got else f'{attr}={q}{rel(index, got)}{q}'

    html = re.sub(r'(?<=<link)((?:[^>]*?)\shref)=(["\'])([^"\']+)\2',
                  lambda m: m.group(0), html)  # placeholder, handled below

    # stylesheets + favicons
    def link_tag(m):
        tag = m.group(0)
        if not re.search(r'rel=["\'](?:stylesheet|icon|shortcut icon|apple-touch-icon)', tag, re.I):
            return tag
        return re.sub(r'(href)=(["\'])([^"\']+)\2', sub_attr, tag)
    html = re.sub(r'<link\b[^>]*>', link_tag, html)

    html = re.sub(r'<script\b[^>]*?\b(src)=(["\'])([^"\']+)\2[^>]*>',
                  lambda m: re.sub(r'(src)=(["\'])([^"\']+)\2', sub_attr, m.group(0)), html)

    html = re.sub(r'<img\b[^>]*>',
                  lambda m: re.sub(r'\b(src|data-src)=(["\'])([^"\']+)\2', sub_attr, m.group(0)), html)

    # inline style="... background-image: url(...) ..."
    def inline_style(m):
        body = m.group(2)
        new = CSS_URL.sub(
            lambda u: (lambda g: m.group(0) if not g else f"url({u.group(1)}{rel(index, g)}{u.group(1)})")(
                None if u.group(2).startswith("data:") else grab(u.group(2), PAGE)),
            body)
        return f'style={m.group(1)}{new}{m.group(1)}'
    html = re.sub(r'style=(["\'])([^"\']*url\([^"\']*)\1', inline_style, html)

    # make site-internal page links absolute so they still work when clicked
    html = re.sub(r'(<a\b[^>]*?\bhref=)(["\'])(/[^"\']*)\2',
                  lambda m: f'{m.group(1)}{m.group(2)}https://primient.com{m.group(3)}{m.group(2)}', html)

    with open(os.path.join(OUT, index), "w", encoding="utf-8") as f:
        f.write(html)


def main():
    # Clear only what this script generates. Deleting the whole folder would
    # take the docs, the scripts and prototype-assets/ with it in the handoff
    # layout, where they sit alongside the site.
    os.makedirs(OUT, exist_ok=True)
    for d in ("css", "js", "images", "fonts", "assets"):
        shutil.rmtree(os.path.join(OUT, d), ignore_errors=True)
    for f in glob.glob(os.path.join(OUT, "*.html")):
        os.remove(f)

    for url, name in PAGES:
        build_page(url, name)

    print(f"\nWrote {len(cache)} assets to {OUT}")
    if failed:
        print(f"\n{len(failed)} failed:")
        for u, e in failed:
            print(f"  {u}  ({e})")


if __name__ == "__main__":
    main()
