/* Single source of truth for the origin the site is published at.
 *
 * Canonical tags, Open Graph URLs, JSON-LD and the sitemap are all machine-read
 * by search engines and social platforms, and every one of them has to name the
 * host that is actually serving the page. Leaving them pointed at a domain that
 * does not resolve yet makes the live URL a self-declared duplicate of it, and
 * search engines drop it.
 *
 * Default is the live Firebase URL. When the real domain is live, either set
 * SITE_ORIGIN=https://thenutscompany.in for the build, or edit the default below.
 */
export const SITE = (
  process.env.SITE_ORIGIN || "https://nuts.eshanura.com"
).replace(/\/+$/, "");

export const BRAND_DOMAIN = "nuts.eshanura.com";

export const PHONE = "+91-9839436346";
export const EMAIL = "care@eshanura.com";
export const PARENT = "Eshanura Enterprises Private Limited";
export const PARENT_URL = "https://eshanura.com";
