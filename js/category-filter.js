/* Prototype: category filtering for the consolidated news overview.
 *
 * Cards carry data-category on the .amsd-item wrapper. The active category
 * comes from the ?category= query string, so the primary-nav dropdown links
 * land on a pre-filtered view. Clicking a filter updates the URL without a
 * reload, which keeps the back button working.
 *
 * To add a category, add it to CATEGORIES below and to the nav dropdown in
 * the HTML. The pill colour comes from css/prototype.css.
 */
(function () {
  'use strict';

  var CATEGORIES = [
    { slug: 'all',           label: 'All Articles' },
    { slug: 'press-release', label: 'Press Releases' },
    { slug: 'news',          label: 'News' },
    { slug: 'blog',          label: 'Blog' }
  ];

  var list = document.querySelector('.amsd-list-items-wrapper');
  var filterNav = document.querySelector('.category-filter');
  if (!list || !filterNav) return;

  var items = Array.prototype.slice.call(list.querySelectorAll('.amsd-item'));
  var emptyMessage = document.querySelector('.category-filter-empty');

  function countFor(slug) {
    if (slug === 'all') return items.length;
    return items.filter(function (item) {
      return item.getAttribute('data-category') === slug;
    }).length;
  }

  function normalise(slug) {
    var known = CATEGORIES.some(function (c) { return c.slug === slug; });
    return known ? slug : 'all';
  }

  function apply(slug) {
    slug = normalise(slug);

    items.forEach(function (item) {
      var match = slug === 'all' || item.getAttribute('data-category') === slug;
      item.classList.toggle('is-hidden', !match);
    });

    list.classList.toggle('is-filtered', slug !== 'all');

    filterNav.querySelectorAll('.category-filter-link').forEach(function (link) {
      var active = link.getAttribute('data-category') === slug;
      link.classList.toggle('is-active', active);
      if (active) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    if (emptyMessage) {
      emptyMessage.hidden = countFor(slug) > 0;
    }
  }

  function currentSlug() {
    var params = new URLSearchParams(window.location.search);
    return normalise(params.get('category') || 'all');
  }

  // fill in the counts next to each filter label
  filterNav.querySelectorAll('.category-filter-link').forEach(function (link) {
    var target = link.querySelector('.category-filter-count');
    if (target) target.textContent = countFor(link.getAttribute('data-category'));

    link.addEventListener('click', function (event) {
      event.preventDefault();
      var slug = link.getAttribute('data-category');
      var url = slug === 'all'
        ? window.location.pathname
        : window.location.pathname + '?category=' + slug;
      window.history.pushState({ category: slug }, '', url);
      apply(slug);
    });
  });

  window.addEventListener('popstate', function () {
    apply(currentSlug());
  });

  apply(currentSlug());
})();
