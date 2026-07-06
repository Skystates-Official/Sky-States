/**
 * Legacy URL map (old WordPress / WooCommerce paths → current Astro routes).
 * Used by middleware for 301 redirects to preserve SEO equity.
 */
export const LEGACY_REDIRECTS = {
  '/product/data-science-ai-program': '/programs/data-science-ai',
  '/product/cyber-security-and-ethical-hacking-program': '/programs/cyber-security',
  '/product/devops-and-cloud-computing-program': '/programs/devops',
  '/refund_returns': '/refund-policy',
  '/about-us': '/about',
  '/category/reviews': '/stories',
  '/sky-states-student-counseling-policy': '/stories',
  '/sky-states-review-courses-programs-student-feedback-2': '/stories',
};

/** Trailing-slash canonicalization for legacy URLs that match current paths. */
export const TRAILING_SLASH_CANONICAL = new Set([
  '/live-jobs',
  '/contact-us',
]);

export function normalizeLegacyPath(pathname) {
  if (!pathname) return '/';
  const lower = pathname.toLowerCase();
  if (lower.length > 1 && lower.endsWith('/')) {
    return lower.slice(0, -1);
  }
  return lower;
}

export function getLegacyRedirect(pathname) {
  const normalized = normalizeLegacyPath(pathname);

  if (LEGACY_REDIRECTS[normalized]) {
    return LEGACY_REDIRECTS[normalized];
  }

  if (TRAILING_SLASH_CANONICAL.has(normalized) && pathname.endsWith('/') && pathname.length > 1) {
    return normalized;
  }

  return null;
}
