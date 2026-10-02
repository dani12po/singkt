import type { Dict, Faq } from "@/lib/i18n/dict";
import { en } from "@/lib/i18n/dict/en";
import { id } from "@/lib/i18n/dict/id";
import { ms } from "@/lib/i18n/dict/ms";
import { ja } from "@/lib/i18n/dict/ja";
import { ko } from "@/lib/i18n/dict/ko";
import { zhcn } from "@/lib/i18n/dict/zh-cn";
import { zhtw } from "@/lib/i18n/dict/zh-tw";
import { de } from "@/lib/i18n/dict/de";
import { fr } from "@/lib/i18n/dict/fr";
import { es } from "@/lib/i18n/dict/es";
import { it } from "@/lib/i18n/dict/it";
import { pt } from "@/lib/i18n/dict/pt";
import { tr } from "@/lib/i18n/dict/tr";
import { ru } from "@/lib/i18n/dict/ru";
import { ar } from "@/lib/i18n/dict/ar";
import { normalizeLocale } from "@/lib/i18n/locales";

const ALL: Record<string, Dict> = {
  en, id, ms, ja, ko, "zh-cn": zhcn, "zh-tw": zhtw, de, fr, es, it, pt, tr, ru, ar,
};

/** Dictionary with English fallback for missing locales. */
export function getDict(locale: string): Dict {
  const code = normalizeLocale(locale);
  return ALL[code] ?? en;
}

/** Per-tool FAQs: unique map when provided, else shared set. */
export function getToolFaqs(toolId: string, locale: string): Faq[] {
  const d = getDict(locale);
  return d.toolFaq?.[toolId] ?? d.toolShared.faqs;
}
