import { canonical, SITE_NAME, SITE_URL } from "@/lib/seo/seo";
import type { FaqItem } from "@/components/tool-ui";

export function organization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  };
}

export function website() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "id",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={query}`,
      },
      "query-input": "required name=query",
    },
  };
}

export function softwareApp(input: { name: string; path: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    url: canonical(input.path),
    description: input.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
    inLanguage: "id",
  };
}

export function webPage(input: { name: string; path: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: canonical(input.path),
    inLanguage: "id",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };
}

export function collectionPage(input: { name: string; path: string; description: string }) {
  return {
    ...webPage(input),
    "@type": "CollectionPage",
  };
}

export function breadcrumb(items: { name: string; path?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: canonical(item.path) } : {}),
    })),
  };
}

export function faqPage(path: string, faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function howTo(input: {
  name: string;
  path: string;
  description: string;
  steps: { t: string; d: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    inLanguage: "id",
    step: input.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.t,
      text: s.d,
    })),
  };
}

export function article(input: {
  title: string;
  path: string;
  description: string;
  datePublished: string;
  tags: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: canonical(input.path),
    datePublished: input.datePublished,
    inLanguage: "id",
    keywords: input.tags.join(", "),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}
