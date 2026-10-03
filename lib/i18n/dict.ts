export interface Faq {
  q: string;
  a: string;
}

export interface Step {
  t: string;
  d: string;
}

export interface ToolStrings {
  name: string;
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroDesc: string;
  placeholder: string;
  originLabel: string;
}

export interface Dict {
  nav: { tools: string; faq: string; about: string; report: string };
  toolGroups: { download: string; social: string; url: string };
  home: {
    brand: string;
    line1: string;
    line2: string;
    sub: string;
    toolsHeading: string;
    whyHeading: string;
    why: { t: string; d: string }[];
  };
  form: {
    pasteLabel: string;
    detected: string;
    generic: string;
    analyzing: string;
    extracting: string;
    preparing: string;
    idleHint: string;
    busyHint: string;
    empty: string;
    invalid: string;
    timeout: string;
    network: string;
    noresult: string;
    rewardFailed: string;
    retry: string;
    resolveAgain: string;
    trust: string;
    another: string;
    ready: string;
    files: string;
    source: string;
    video: string;
    audio: string;
    photos: string;
    download: string;
    locked: string;
    free: string;
    premium: string;
    freeNote: string;
    noVariant: string;
  };
  ad: {
    title: string;
    slotA: string;
    slotB: string;
    wait: string;
    done: string;
    unlock: string;
    watching: string;
    cancel: string;
    unlocking: string;
  };
  shell: { how: string; features: string; faq: string; related: string };
  shortlink: {
    heroTitle: string;
    heroDesc: string;
    placeholder: string;
    advanced: string;
    aliasPh: string;
    expiry: string;
    button: string;
    working: string;
    okTitle: string;
    copy: string;
    copied: string;
    copiedMsg: string;
    qr: string;
    share: string;
    new: string;
    preview: string;
    stats: string;
    noExpiry: string;
    expiredOn: string;
    downloadQr: string;
    empty: string;
    scheme: string;
    netErr: string;
    trust: string;
    how: string;
    s1t: string;
    s1d: string;
    s2t: string;
    s2d: string;
    s3t: string;
    s3d: string;
    faqTitle: string;
  };
  tools: Record<string, ToolStrings>;
  toolShared: { steps: Step[]; features: string[]; faqs: Faq[] };
  /** Per-tool unique FAQs (only locales that provide them; else shared). */
  toolFaq?: Record<string, Faq[]>;
  generalFaq: { title: string; items: Faq[] };
  search: { title: string; sub: string; placeholder: string; none: string; open: string };
  footerTagline: string;
  report: {
    title: string;
    sub: string;
    link: string;
    reason: string;
    detail: string;
    detailPh: string;
    send: string;
    sending: string;
    ok: string;
  };
  misc: {
    back: string;
    loading: string;
    processAnother: string;
    openTool: string;
    toolsWord: string;
  };
  hints: Record<string, string>;
  expiryOpts: string[];
  cookies: { title: string; text: string; accept: string; decline: string; policy: string };
}
