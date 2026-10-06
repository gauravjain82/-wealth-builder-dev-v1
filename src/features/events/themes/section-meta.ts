/**
 * Builder-facing metadata for each landing section type: label, help text,
 * whether it is model-backed (renders another tab's data, at most once), and
 * the empty content a freshly added section starts with.
 *
 * Kept in a `.ts` module (no components) for Vite fast refresh.
 */

import type { SectionContentMap, SectionType } from '../types/landing';

export interface SectionMeta {
  label: string;
  description: string;
  /** Renders data owned by another builder tab; may appear only once. */
  modelBacked: boolean;
  /** For model-backed sections: where the organizer edits the data. */
  sourceTab?: string;
  /** Heading shown when the section's title is blank (empty = no heading). */
  defaultTitle: string;
  /** Model-backed, but also carries optional content edited on the Page tab. */
  hasContent?: boolean;
}

export const SECTION_META: Record<SectionType, SectionMeta> = {
  about: {
    label: 'About',
    description: 'The About and Notes text.',
    modelBacked: true,
    sourceTab: 'Event',
    defaultTitle: 'About This Event',
  },
  pricing: {
    label: 'Ticket prices',
    description:
      'Current and upcoming pricing tiers. Add value copy below to show the current price as a single ticket card.',
    modelBacked: true,
    sourceTab: 'Ticket Price',
    defaultTitle: 'Tickets',
    hasContent: true,
  },
  checkout: {
    label: 'Ticket checkout',
    description:
      'The purchase form, right on the page — visitors buy without leaving it. Ticket buttons elsewhere on the page scroll to it.',
    modelBacked: true,
    sourceTab: 'Ticket Price',
    defaultTitle: 'Get Your Ticket',
  },
  speakers: {
    label: 'Speakers',
    description: 'Speaker cards with photos and bios.',
    modelBacked: true,
    sourceTab: 'Speakers',
    defaultTitle: 'Speakers',
  },
  add_ons: {
    label: 'Add-ons',
    description: 'Extras attendees can buy at checkout.',
    modelBacked: true,
    sourceTab: 'Add-Ons',
    defaultTitle: 'Add-Ons',
  },
  partners: {
    label: 'Product partners',
    description: 'Sponsors grouped by level.',
    modelBacked: true,
    sourceTab: 'Product Partners',
    defaultTitle: 'Product Partners',
  },
  location: {
    label: 'Location',
    description: 'Venue, address, map and room booking.',
    modelBacked: true,
    sourceTab: 'Location',
    defaultTitle: 'Location',
  },
  refund_policy: {
    label: 'Refund policy',
    description: 'The refund policy text.',
    modelBacked: true,
    sourceTab: 'Policies',
    defaultTitle: 'Refund Policy',
  },
  questions: {
    label: 'Ask a question',
    description: 'A form attendees use to message the organizer.',
    modelBacked: true,
    sourceTab: 'Event',
    defaultTitle: 'Have a Question?',
  },
  contact: {
    label: 'Contact',
    description: 'The public contact email (when "Show contact email" is on).',
    modelBacked: true,
    sourceTab: 'Event',
    defaultTitle: 'Questions?',
  },
  pillars: {
    label: 'Pillars',
    description: 'Intro text plus up to six numbered value cards.',
    modelBacked: false,
    defaultTitle: 'What We Stand For',
  },
  testimonials: {
    label: 'Testimonials',
    description: 'Quotes from past attendees, with optional photo and video.',
    modelBacked: false,
    defaultTitle: 'What Attendees Say',
  },
  faq: {
    label: 'FAQ',
    description: 'Questions and answers shown as an accordion.',
    modelBacked: false,
    defaultTitle: 'Frequently Asked Questions',
  },
  agenda: {
    label: 'Agenda',
    description: 'A day-by-day schedule.',
    modelBacked: false,
    defaultTitle: 'Agenda',
  },
  gallery: {
    label: 'Gallery',
    description: 'A grid of photos with captions.',
    modelBacked: false,
    defaultTitle: 'Gallery',
  },
  video: {
    label: 'Video',
    description: 'An embedded YouTube, Vimeo or MP4 video.',
    modelBacked: false,
    defaultTitle: '',
  },
  cta_band: {
    label: 'Call to action',
    description: 'A bold closing band with a "Get your ticket" button.',
    modelBacked: false,
    defaultTitle: '',
  },
  rich_text: {
    label: 'Text block',
    description: 'Free-form formatted text.',
    modelBacked: false,
    defaultTitle: '',
  },
  tagline: {
    label: 'Tagline',
    description:
      'Short hook lines, a strip of highlight words, and the ticket button with up to two extra links.',
    modelBacked: false,
    defaultTitle: '',
  },
  stats: {
    label: 'Stats',
    description: 'One to four big numbers — typed in, or live from ticket sales.',
    modelBacked: false,
    defaultTitle: '',
  },
  marquee: {
    label: 'Photo strip',
    description: 'A scrolling strip of photos with names, e.g. past speakers.',
    modelBacked: false,
    defaultTitle: '',
  },
};

/** Picker order for "Add section": content sections first, then the rest. */
export const ADDABLE_SECTION_ORDER: SectionType[] = [
  'tagline',
  'pillars',
  'stats',
  'marquee',
  'testimonials',
  'faq',
  'agenda',
  'gallery',
  'video',
  'cta_band',
  'rich_text',
  'about',
  'pricing',
  'checkout',
  'speakers',
  'add_ons',
  'partners',
  'location',
  'refund_policy',
  'questions',
  'contact',
];

const EMPTY_CONTENT: { [K in keyof SectionContentMap]: () => SectionContentMap[K] } = {
  pillars: () => ({ intro: '', items: [{ title: '', body: '' }] }),
  testimonials: () => ({
    items: [{ quote: '', name: '', subtitle: '', photo_blob: '', video_url: '' }],
  }),
  faq: () => ({ items: [{ question: '', answer: '' }] }),
  agenda: () => ({
    days: [{ label: 'Day 1', items: [{ time: '', title: '', description: '', speaker: '' }] }],
  }),
  gallery: () => ({ images: [] }),
  video: () => ({ url: '', caption: '' }),
  cta_band: () => ({
    heading: '',
    subtext: '',
    button_label: '',
    size: 'banner',
    body: [],
    highlight: '',
    signoff: '',
  }),
  rich_text: () => ({ body: '' }),
  // Starter copy matches the Champion default layout, so a new section looks finished.
  tagline: () => ({
    lines: [
      'The weekend that changes everything.',
      'Learn the business. Rebuild your mind.',
      "Become who you're meant to be.",
    ],
    highlight_last: true,
    words: ['CONNECT', 'LEARN', 'GROW', 'BELIEVE', 'BUILD', 'CELEBRATE'],
    links: [],
  }),
  stats: () => ({
    items: [
      { source: 'tickets_remaining', label: "Seats left · when it's full, it's full", value: '' },
    ],
  }),
  marquee: () => ({ intro: '', items: [] }),
};

/** Starting content for a newly added section (`{}` for model-backed). */
export function emptyContent(type: SectionType): Record<string, unknown> {
  const factory = EMPTY_CONTENT[type as keyof SectionContentMap];
  return factory ? (factory() as unknown as Record<string, unknown>) : {};
}
