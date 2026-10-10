/**
 * Landing-page sections — mirrors `events/models/landing.py` and the content
 * schemas in `events/services/landing_sections.py`.
 */

/** Sections that render data owned by other builder tabs (at most one each). */
export type ModelBackedSectionType =
  | 'about'
  | 'pricing'
  | 'speakers'
  | 'add_ons'
  | 'partners'
  | 'location'
  | 'refund_policy'
  | 'questions'
  | 'contact'
  /** Inline purchase form (renders the checkout on the landing page). */
  | 'checkout';

/** Sections whose data is stored on the section itself (may repeat). */
export type ContentSectionType =
  | 'pillars'
  | 'testimonials'
  | 'faq'
  | 'agenda'
  | 'gallery'
  | 'video'
  | 'cta_band'
  | 'rich_text'
  | 'tagline'
  | 'stats'
  | 'marquee';

export type SectionType = ModelBackedSectionType | ContentSectionType;

export interface PillarsContent {
  intro: string;
  items: { title: string; body: string }[];
}

export interface TestimonialItem {
  quote: string;
  name: string;
  subtitle: string;
  photo_blob: string;
  /** Signed URL (read-only; ignored on save). */
  photo_url?: string | null;
  video_url: string;
}

export interface TestimonialsContent {
  items: TestimonialItem[];
}

export interface FaqContent {
  items: { question: string; answer: string }[];
}

export interface AgendaItem {
  time: string;
  title: string;
  description: string;
  speaker: string;
  /** Room or venue, e.g. "Grand Ballroom". */
  location?: string;
  /** A short tag such as "Qualifiers only". */
  note?: string;
}

/**
 * `manual`: the hand-written `days`. `sessions`: the public page lists the
 * event's sessions marked "Show on public agenda" instead — `days` is kept, so
 * switching back loses nothing.
 */
export type AgendaSource = 'manual' | 'sessions';

export interface AgendaContent {
  source?: AgendaSource;
  days: { label: string; items: AgendaItem[] }[];
}

export interface GalleryImage {
  blob: string;
  /** Signed URL (read-only; ignored on save). */
  url?: string | null;
  caption: string;
}

export interface GalleryContent {
  images: GalleryImage[];
}

export interface VideoContent {
  url: string;
  caption: string;
}

/** `banner`: the compact strip. `final`: a full-height closing call. */
export type CtaBandSize = 'banner' | 'final';

export interface CtaBandContent {
  heading: string;
  subtext: string;
  button_label: string;
  /** Absent on rows saved before sizes existed; treat as `banner`. */
  size?: CtaBandSize;
  /** Extra paragraphs, shown under the heading in the `final` size. */
  body?: string[];
  /** A word or phrase in `body` rendered in the accent colour. */
  highlight?: string;
  /** Closing line under the button. */
  signoff?: string;
}

/**
 * Optional value framing for the model-backed `pricing` section. Prices still
 * come from the server (`current_tier`); this is copy only.
 */
export interface PricingContent {
  /** Small label above the card; blank → "Your ticket". */
  eyebrow?: string;
  /** Ticket button text; blank → the theme's default ("Claim your seat"). */
  button_label?: string;
  /** e.g. "Seeing these speakers anywhere else runs $5,000+". */
  anchor_text?: string;
  /** Struck-through comparison figure, e.g. "$5,000+". Free text, never computed. */
  anchor_price?: string;
  inclusions?: string[];
  /** Bold one-liner under the button. */
  motto?: string;
  fine_print?: string;
}

/**
 * Optional framing for the model-backed `checkout` section. The price charged
 * still comes from the server (`current_tier`); nothing here is computed.
 */
export interface CheckoutContent {
  /** Struck-through regular price before the current one, e.g. "$49". Free text. */
  anchor_price?: string;
  /** The scan-to-buy QR code in the top bar. Absent → shown. */
  show_qr?: boolean;
  /**
   * What our own leaders' team is called in the buyer's team list, e.g.
   * "Kash Rastan". Blank → "Wealth Builder". External teams use their own names.
   */
  own_team_label?: string;
}

/** Hook lines under the hero, a rotating word strip and secondary links. */
export interface TaglineContent {
  /** 1–4 lines; the last renders in the accent colour when `highlight_last`. */
  lines: string[];
  highlight_last: boolean;
  /** 0–8 short words, e.g. CONNECT · LEARN · GROW. */
  words: string[];
  /** 0–2 links beside the primary ticket CTA; `url` is http(s) or `#anchor`. */
  links: { label: string; url: string }[];
  /** Primary ticket button text; blank → the theme's default. */
  button_label?: string;
}

/**
 * Where a stat's value comes from. `tickets_remaining` reads
 * `sales_state.tickets_remaining`; `tickets_sold` reads `PublicEvent.tickets_sold`,
 * which the server only includes when an enabled stats section asks for it.
 * A live stat whose value is absent is hidden, never shown as 0.
 */
export type StatSource = 'static' | 'tickets_remaining' | 'tickets_sold';

export interface StatItem {
  /** Shown for `static`; ignored for live sources. */
  value: string;
  label: string;
  source: StatSource;
}

export interface StatsContent {
  items: StatItem[];
}

export interface MarqueeItem {
  name: string;
  photo_blob: string;
  /** CDN URL (read-only; ignored on save). */
  photo_url?: string | null;
}

/** A scrolling strip of past speakers or logos. */
export interface MarqueeContent {
  intro: string;
  items: MarqueeItem[];
}

export interface RichTextContent {
  body: string;
}

/** Content shape per section type (model-backed sections carry none). */
export interface SectionContentMap {
  pillars: PillarsContent;
  testimonials: TestimonialsContent;
  faq: FaqContent;
  agenda: AgendaContent;
  gallery: GalleryContent;
  video: VideoContent;
  cta_band: CtaBandContent;
  rich_text: RichTextContent;
  tagline: TaglineContent;
  stats: StatsContent;
  marquee: MarqueeContent;
}

export interface LandingSection {
  /** `null` for theme-default sections that have not been saved yet. */
  id: number | null;
  section_type: SectionType;
  /** Heading override; blank uses the section's default heading. */
  title: string;
  sort_order: number;
  is_enabled: boolean;
  content: Record<string, unknown>;
}

/** `GET/PUT/DELETE /events/{id}/landing-sections/` response. */
export interface LandingLayout {
  /** True when the event has no saved layout and follows its theme default. */
  is_default: boolean;
  sections: LandingSection[];
}
