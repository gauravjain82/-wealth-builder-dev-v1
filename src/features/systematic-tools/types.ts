/**
 * Contracts for the backend-managed "10 Systematic Tools" page.
 *
 * Tool = content section, content = content item (shared `content` app
 * machinery, same as File Vault and Training Center).
 */

/** What clicking a content card does. */
export type SystematicToolAction =
  | 'open'
  | 'nal_flyer'
  | 'business_shower_flyer'
  | 'coming_soon';

export type SystematicToolsConfig = {
  page_title: string;
  page_subtitle: string;
};

/** User-facing item, already filtered by the viewer's roles. */
export type SystematicToolItem = {
  id: number;
  title: string;
  /** `"#"` for uploaded PDFs, which open through the access/file endpoints. */
  href: string;
  thumb: string | null;
  resource_type: string;
  action: SystematicToolAction;
  allow_download: boolean;
  is_pdf: boolean;
  sort_order: number;
};

export type SystematicTool = {
  id: string;
  section_key: string;
  icon: string;
  label: string;
  items: SystematicToolItem[];
};

export type SystematicToolsResponse = {
  config: SystematicToolsConfig;
  can_manage: boolean;
  tools: SystematicTool[];
};

export type SystematicToolItemAdmin = {
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
  action: SystematicToolAction;
  allow_download: boolean;
  sort_order: number;
  is_active: boolean;
  allowed_roles: string[];
  updated_at?: string;
};

export type SystematicToolAdmin = {
  id: number;
  section_key: string;
  label: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  allowed_roles: string[];
  items: SystematicToolItemAdmin[];
  updated_at?: string;
};
