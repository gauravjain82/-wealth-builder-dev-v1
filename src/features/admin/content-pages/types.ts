/**
 * Shared admin contracts for CMS-managed content pages.
 *
 * File Vault and Training Center expose the same admin API shape, so their
 * admin UI is one implementation configured per page.
 */

export const CONTENT_ROLES = [
  'NEW_AGENT',
  'AGENT',
  'LEADER',
  'BROKER',
  'SENIOR_BROKER',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

export type ContentRole = (typeof CONTENT_ROLES)[number];

export type ContentSectionAdmin = {
  id: number;
  section_key: string;
  label: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  allowed_roles: string[];
  items: ContentItemAdmin[];
  updated_at?: string;
};

export type ContentItemAdmin = {
  id: number;
  section: number;
  title: string;
  href: string;
  resolved_href?: string;
  thumbnail_url: string;
  resolved_thumb?: string;
  gcs_blob_name: string;
  thumb_gcs_blob_name: string;
  resource_type: string;
  allow_download: boolean;
  sort_order: number;
  is_active: boolean;
  updated_at?: string;
  allowed_roles: string[];
};

export type ContentSectionFormPayload = {
  section_key: string;
  label: string;
  icon: string;
  is_active: boolean;
  roles: string[];
};

/** Common item fields plus whatever page-specific fields the schema declares. */
export type ContentItemFormPayload = {
  title: string;
  href: string;
  thumbnail_url: string;
  gcs_blob_name?: string;
  thumb_gcs_blob_name?: string;
  resource_type: string;
  allow_download: boolean;
  is_active: boolean;
  roles: string[];
} & Record<string, unknown>;

export type ContentUploadResult = {
  blob_name: string;
  url: string;
  item: ContentItemAdmin;
};

export type FieldValue = string | number | boolean;

/** Declarative description of a page-specific form field. */
export type ContentFieldSchema =
  | { kind: 'text'; name: string; label: string; placeholder?: string; hint?: string }
  | {
      kind: 'number';
      name: string;
      label: string;
      min?: number;
      max?: number;
      hint?: string;
    }
  | { kind: 'textarea'; name: string; label: string; rows?: number; hint?: string }
  | {
      kind: 'select';
      name: string;
      label: string;
      options: Array<{ value: string; label: string }>;
      hint?: string;
    }
  | { kind: 'checkbox'; name: string; label: string; hint?: string };

export function defaultFieldValue(field: ContentFieldSchema): FieldValue {
  switch (field.kind) {
    case 'number':
      return field.min ?? 0;
    case 'checkbox':
      return false;
    case 'select':
      return field.options[0]?.value ?? '';
    default:
      return '';
  }
}

/** All admin service calls a content page must provide. */
export type ContentAdminApi<
  TSection extends ContentSectionAdmin,
  TItem extends ContentItemAdmin,
> = {
  listSections: () => Promise<TSection[]>;
  createSection: (payload: Record<string, unknown>) => Promise<TSection>;
  updateSection: (id: number, payload: Record<string, unknown>) => Promise<TSection>;
  deleteSection: (id: number) => Promise<void>;
  updateSectionRoles: (id: number, roles: string[]) => Promise<TSection>;
  reorderSections: (ids: number[]) => Promise<void>;
  createItem: (payload: Record<string, unknown>) => Promise<TItem>;
  updateItem: (id: number, payload: Record<string, unknown>) => Promise<TItem>;
  deleteItem: (id: number) => Promise<void>;
  updateItemRoles: (id: number, roles: string[]) => Promise<TItem>;
  reorderItems: (ids: number[]) => Promise<void>;
  uploadItemFile: (
    id: number,
    file: File,
    uploadType: 'file' | 'thumbnail'
  ) => Promise<ContentUploadResult>;
};
