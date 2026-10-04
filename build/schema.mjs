/* Structured data, generated per page from the same catalogue the site renders.
 *
 * Follows the pattern EasyCare uses: Product entries carry descriptive facts and
 * additionalProperty values drawn from the pack label, and deliberately NO offers
 * or prices. A repacker does not publish prices or nutrition it cannot stand
 * behind, and an Offer block with invented numbers is worse than no Offer block
 * at all - it is a rich result that says something false.
 */
import { SITE, BRAND_DOMAIN, PHONE, EMAIL, PARENT, PARENT_URL } from "./site-config.mjs";

export const ORG_ID = `${SITE}/#org`;
export const SITE_ID = `${SITE}/#website`;

const IMG = (p) => `${SITE}/${p}`;

export const organization = () => ({
  "@type": "Organization",
  "@id": ORG_ID,
  name: "The Nuts Company",
  alternateName: BRAND_DOMAIN,
  url: `${SITE}/`,
  logo: {
    "@type": "ImageObject",
    url: IMG("assets/img/brand/favicon-512.png"),
    width: 512,
    height: 512,
  },
  image: IMG("assets/img/scenes/hero-art.webp"),
  description:
    "Almonds, cashews and raisins in four pack sizes from 20 g to 200 g, " +
    "packed and distributed by Eshanura Enterprises Private Limited.",
  email: EMAIL,
  telephone: PHONE,
  parentOrganization: { "@type": "Organization", name: PARENT, url: PARENT_URL },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer care",
      telephone: PHONE,
      email: EMAIL,
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
  ],
});

export const webSite = () => ({
  "@type": "WebSite",
  "@id": SITE_ID,
  url: `${SITE}/`,
  name: "The Nuts Company",
  publisher: { "@id": ORG_ID },
  inLanguage: "en-IN",
});

export const brand = () => ({
  "@type": "Brand",
  name: "The Nuts Company",
  logo: IMG("assets/img/brand/favicon-512.png"),
});

/** items: [[label, url], ...] with the current page last. */
export function breadcrumb(items) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${SITE}/#breadcrumb`,
    itemListElement: items.map(([name, url], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: url === SITE + "/" || url === `${SITE}/` ? `${SITE}/` : `${SITE}/${url}`,
    })),
  };
}

/** One Product per nut type, sized off the real pack range. */
function product(kind) {
  return {
    "@type": "Product",
    name: `${kind.label}`,
    description: kind.blurb,
    category: "Packed nuts — dry fruits",
    image: IMG(`assets/img/products/${kind.slug}-200.webp`),
    brand: { "@type": "Brand", name: "The Nuts Company" },
    countryOfOrigin: { "@type": "Country", name: "India" },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Net qty options", value: "20 g, 50 g, 100 g, 200 g" },
      { "@type": "PropertyValue", name: "Pack", value: "Resealable pouch" },
      { "@type": "PropertyValue", name: "Contents", value: `Single nut only — no blend, no coating (${kind.label.toLowerCase()})` },
    ],
  };
}

export function itemList(kinds) {
  return {
    "@type": "ItemList",
    "@id": `${SITE}/nuts.html#rangelist`,
    name: "The Nuts Company range",
    numberOfItems: kinds.length,
    itemListElement: kinds.map((k, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: k.label,
        url: `${SITE}/nuts.html#${k.slug}`,
        image: IMG(`assets/img/products/${k.slug}-200.webp`),
        brand: { "@type": "Brand", name: "The Nuts Company" },
        category: "Packed nuts — dry fruits",
        additionalProperty: [
          { "@type": "PropertyValue", name: "Net qty options", value: "20 g, 50 g, 100 g, 200 g" },
        ],
      },
    })),
  };
}

export const products = (kinds) => kinds.map(product);

/** Assemble the @graph for a page. */
export function graph({ crumbs = null, list = null, products: prods = null } = {}) {
  const g = [organization(), webSite()];
  if (crumbs) g.push(crumbs);
  if (list) g.push(list);
  if (prods) g.push(...prods);
  return { "@context": "https://schema.org", "@graph": g };
}
