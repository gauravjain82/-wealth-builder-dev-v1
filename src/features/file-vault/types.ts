export type FileVaultConfig = {
  page_title: string;
  search_enabled: boolean;
  updated_at?: string;
};

export type FileVaultItem = {
  id: number;
  title: string;
  href: string;
  thumb?: string | null;
  type?: 'row' | null;
  item_view_type: 'row' | 'card';
  resource_type: string;
  sort_order: number;
};

export type FileVaultSection = {
  id: string;
  section_key: string;
  icon: string;
  label: string;
  items: FileVaultItem[];
};

export type FileVaultResponse = {
  config: FileVaultConfig;
  sections: FileVaultSection[];
};

export type FileVaultSectionAdmin = {
  id: number;
  section_key: string;
  label: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  allowed_roles: string[];
  items: FileVaultItemAdmin[];
  updated_at?: string;
};

export type FileVaultItemAdmin = {
  id: number;
  section: number;
  title: string;
  href: string;
  resolved_href?: string;
  item_view_type: 'row' | 'card';
  thumbnail_url: string;
  resolved_thumb?: string;
  gcs_blob_name: string;
  thumb_gcs_blob_name: string;
  resource_type: string;
  sort_order: number;
  is_active: boolean;
  allowed_roles: string[];
  updated_at?: string;
};

export type FileVaultSectionPayload = {
  section_key: string;
  label: string;
  icon: string;
  sort_order?: number;
  is_active: boolean;
};

export type FileVaultItemPayload = {
  section: number;
  title: string;
  href: string;
  item_view_type: 'row' | 'card';
  thumbnail_url?: string;
  gcs_blob_name?: string;
  thumb_gcs_blob_name?: string;
  resource_type: string;
  sort_order?: number;
  is_active: boolean;
};

export const FILE_VAULT_ROLES = [
  'NEW_AGENT',
  'AGENT',
  'LEADER',
  'BROKER',
  'SENIOR_BROKER',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

export type FileVaultRole = (typeof FILE_VAULT_ROLES)[number];
