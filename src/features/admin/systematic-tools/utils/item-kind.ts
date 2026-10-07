import { isSlidesUrl } from '@/features/systematic-tools/components/fullscreen-viewer';
import type {
  SystematicToolAction,
  SystematicToolItemAdmin,
} from '@/features/systematic-tools/types';

/**
 * What clicking a content card does, as the admin picks it.
 *
 * The backend stores this as `{action, resource_type}`; this is the
 * human-facing choice the content form starts with.
 */
export type ItemKind =
  | 'slides'
  | 'pdf'
  | 'link'
  | 'nal_flyer'
  | 'business_shower_flyer'
  | 'coming_soon';

export type ItemKindOption = {
  kind: ItemKind;
  label: string;
  hint: string;
  /** Short name for card badges. */
  badge: string;
  action: SystematicToolAction;
  resourceType: string;
};

export const ITEM_KIND_OPTIONS: ItemKindOption[] = [
  {
    kind: 'slides',
    label: 'Show a presentation (Google Slides)',
    hint: 'Opens full screen inside the app.',
    badge: 'Slides',
    action: 'open',
    resourceType: 'ppt',
  },
  {
    kind: 'pdf',
    label: 'Show a PDF',
    hint: 'Upload a PDF or paste a link. View-only unless you allow downloads.',
    badge: 'PDF',
    action: 'open',
    resourceType: 'pdf',
  },
  {
    kind: 'link',
    label: 'Open a link',
    hint: 'Any web page; opens in a new tab.',
    badge: 'Link',
    action: 'open',
    resourceType: 'link',
  },
  {
    kind: 'nal_flyer',
    label: 'Custom flyer – New Art of Living',
    hint: 'Opens the New Art of Living flyer builder.',
    badge: 'NAL flyer',
    action: 'nal_flyer',
    resourceType: 'link',
  },
  {
    kind: 'business_shower_flyer',
    label: 'Custom flyer – Business Shower',
    hint: 'Opens the Business Shower flyer builder.',
    badge: 'Business Shower flyer',
    action: 'business_shower_flyer',
    resourceType: 'link',
  },
  {
    kind: 'coming_soon',
    label: 'Coming soon',
    hint: 'Shows a greyed-out card that cannot be opened yet.',
    badge: 'Coming soon',
    action: 'coming_soon',
    resourceType: 'link',
  },
];

export function itemKindOption(kind: ItemKind): ItemKindOption {
  return ITEM_KIND_OPTIONS.find((option) => option.kind === kind) ?? ITEM_KIND_OPTIONS[0];
}

/** Kinds that need a URL or file to open. */
export function kindNeedsTarget(kind: ItemKind): boolean {
  return kind === 'slides' || kind === 'pdf' || kind === 'link';
}

/** Work out which choice an existing item was saved with. */
export function inferItemKind(item: Pick<
  SystematicToolItemAdmin,
  'action' | 'resource_type' | 'href' | 'gcs_blob_name'
>): ItemKind {
  if (item.action === 'nal_flyer') return 'nal_flyer';
  if (item.action === 'business_shower_flyer') return 'business_shower_flyer';
  if (item.action === 'coming_soon') return 'coming_soon';
  if (item.resource_type === 'pdf' || item.gcs_blob_name?.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }
  if (item.resource_type === 'ppt' || (item.href && isSlidesUrl(item.href))) return 'slides';
  return 'link';
}

/** True for a Google Slides share, publish or embed link the viewer can show. */
export function isGoogleSlidesUrl(url: string): boolean {
  const value = url.trim();
  return isSlidesUrl(value) && /^https:\/\/docs\.google\.com\/presentation\/d\/[^/?#]+/.test(value);
}
