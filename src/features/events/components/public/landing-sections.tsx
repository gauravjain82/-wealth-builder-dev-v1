/**
 * Renders an event's landing sections in the organizer's order.
 *
 * The API returns enabled sections only (or the theme's default layout when
 * the page was never customised). Each `section_type` maps to one renderer;
 * an unknown type — e.g. one added server-side before this client shipped —
 * renders nothing rather than breaking the page.
 */

import { Fragment, type ReactNode } from 'react';

import type {
  AgendaContent,
  CtaBandContent,
  FaqContent,
  GalleryContent,
  LandingSection,
  MarqueeContent,
  PillarsContent,
  PricingContent,
  RichTextContent,
  SectionType,
  StatsContent,
  TaglineContent,
  TestimonialsContent,
  VideoContent,
} from '../../types/landing';
import type { PublicEvent } from '../../types/public';
import {
  AgendaSection,
  CtaBandSection,
  FaqSection,
  GallerySection,
  PillarsSection,
  RichTextSection,
  TestimonialsSection,
  VideoSection,
} from './content-sections';
import { InlineCheckoutSection } from './inline-checkout-section';
import {
  AboutSection,
  AddOnsPreviewSection,
  ContactSection,
  LocationSection,
  RefundPolicySection,
} from './location-section';
import { PartnersSection } from './partners-section';
import { PricingTiersSection } from './pricing-tiers-section';
import { QuestionSection } from './question-section';
import {
  MarqueeSection,
  StatsSection,
  TaglineSection,
} from './showcase-sections';
import { SpeakersSection } from './speakers-section';

type Renderer = (event: PublicEvent, section: LandingSection) => ReactNode;

/** Section type → renderer (Strategy). Add a type: one entry here. */
const RENDERERS: Record<SectionType, Renderer> = {
  about: (event, s) => <AboutSection event={event} title={s.title} />,
  pricing: (event, s) => (
    <PricingTiersSection
      event={event}
      title={s.title}
      content={s.content as PricingContent}
    />
  ),
  checkout: (event, s) => <InlineCheckoutSection event={event} title={s.title} />,
  speakers: (event, s) => (
    <SpeakersSection speakers={event.speakers} title={s.title} />
  ),
  add_ons: (event, s) => <AddOnsPreviewSection event={event} title={s.title} />,
  partners: (event, s) => (
    <PartnersSection partners={event.partners} title={s.title} />
  ),
  location: (event, s) => <LocationSection event={event} title={s.title} />,
  refund_policy: (event, s) => (
    <RefundPolicySection event={event} title={s.title} />
  ),
  questions: (event, s) => (
    <QuestionSection
      shortcut={event.shortcut}
      contactEmail={event.show_email ? event.contact_email : undefined}
      title={s.title}
    />
  ),
  contact: (event, s) => <ContactSection event={event} title={s.title} />,
  pillars: (_e, s) => (
    <PillarsSection
      content={s.content as unknown as PillarsContent}
      title={s.title}
    />
  ),
  testimonials: (_e, s) => (
    <TestimonialsSection
      content={s.content as unknown as TestimonialsContent}
      title={s.title}
    />
  ),
  faq: (_e, s) => (
    <FaqSection content={s.content as unknown as FaqContent} title={s.title} />
  ),
  agenda: (_e, s) => (
    <AgendaSection
      content={s.content as unknown as AgendaContent}
      title={s.title}
    />
  ),
  gallery: (_e, s) => (
    <GallerySection
      content={s.content as unknown as GalleryContent}
      title={s.title}
    />
  ),
  video: (_e, s) => (
    <VideoSection
      content={s.content as unknown as VideoContent}
      title={s.title}
    />
  ),
  cta_band: (event, s) => (
    <CtaBandSection
      content={s.content as unknown as CtaBandContent}
      event={event}
    />
  ),
  rich_text: (_e, s) => (
    <RichTextSection
      content={s.content as unknown as RichTextContent}
      title={s.title}
    />
  ),
  tagline: (event, s) => (
    <TaglineSection
      content={s.content as unknown as TaglineContent}
      title={s.title}
      event={event}
    />
  ),
  stats: (event, s) => (
    <StatsSection
      content={s.content as unknown as StatsContent}
      title={s.title}
      event={event}
    />
  ),
  marquee: (_e, s) => (
    <MarqueeSection
      content={s.content as unknown as MarqueeContent}
      title={s.title}
    />
  ),
};

/** Legacy fixed order, used only against a backend without `sections`. */
const FALLBACK: LandingSection[] = (
  [
    'about',
    'pricing',
    'speakers',
    'add_ons',
    'partners',
    'location',
    'refund_policy',
    'questions',
    'contact',
  ] as SectionType[]
).map((section_type, sort_order) => ({
  id: null,
  section_type,
  title: '',
  sort_order,
  is_enabled: true,
  content: {},
}));

export function LandingSections({ event }: { event: PublicEvent }) {
  const sections = event.sections ?? FALLBACK;
  return (
    <>
      {sections.map((section, index) => {
        const render = RENDERERS[section.section_type];
        return render ? (
          // Fragments add no DOM, so `PublicSection`'s `first:mt-0` still applies.
          <Fragment key={section.id ?? `default-${index}`}>
            {render(event, section)}
          </Fragment>
        ) : null;
      })}
    </>
  );
}
