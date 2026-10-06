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
  | 'contact';

/** Sections whose data is stored on the section itself (may repeat). */
export type ContentSectionType =
  'pillars' | 'testimonials' | 'faq' | 'agenda' | 'gallery' | 'video' | 'cta_band' | 'rich_text';

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

export interface CtaBandContent {
  heading: string;
  subtext: string;
  button_label: string;
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
