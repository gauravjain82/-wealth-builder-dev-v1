export type TrainingCenterConfig = {
  page_title: string;
  page_subtitle: string;
  search_enabled: boolean;
  xp_per_level: number;
  updated_at?: string;
};

export type TrainingCenterItem = {
  id: number;
  item_key: string | null;
  title: string;
  description: string;
  href: string;
  thumb?: string | null;
  resource_type: string;
  allow_download: boolean;
  is_pdf: boolean;
  xp: number;
  duration_minutes: number | null;
  sort_order: number;
};

export type TrainingCenterSection = {
  id: string;
  section_key: string;
  icon: string;
  label: string;
  items: TrainingCenterItem[];
};

export type TrainingSectionProgress = {
  section_key: string;
  opened: number;
  total: number;
  percent: number;
};

export type TrainingProgress = {
  total_xp: number;
  level: number;
  xp_per_level: number;
  xp_for_next_level: number;
  xp_progress_percent: number;
  completed_item_ids: number[];
  opened_count: number;
  total_items: number;
  exploration_percent: number;
  sections: TrainingSectionProgress[];
};

export type TrainingCenterResponse = {
  config: TrainingCenterConfig;
  sections: TrainingCenterSection[];
  progress: TrainingProgress;
};

export type CompleteTrainingItemResponse = {
  xp_earned: number;
  progress: TrainingProgress;
};

export type TrainingCenterSectionAdmin = {
  id: number;
  section_key: string;
  label: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  allowed_roles: string[];
  items: TrainingCenterItemAdmin[];
  updated_at?: string;
};

export type TrainingCenterItemAdmin = {
  id: number;
  section: number;
  item_key: string | null;
  title: string;
  description: string;
  href: string;
  resolved_href?: string;
  thumbnail_url: string;
  resolved_thumb?: string;
  gcs_blob_name: string;
  thumb_gcs_blob_name: string;
  resource_type: string;
  allow_download: boolean;
  xp: number;
  duration_minutes: number | null;
  sort_order: number;
  is_active: boolean;
  allowed_roles: string[];
  updated_at?: string;
};

export type TrainingCenterSectionPayload = {
  section_key: string;
  label: string;
  icon: string;
  sort_order?: number;
  is_active: boolean;
};

export type TrainingCenterItemPayload = {
  section: number;
  title: string;
  item_key?: string;
  description?: string;
  href: string;
  thumbnail_url?: string;
  gcs_blob_name?: string;
  thumb_gcs_blob_name?: string;
  resource_type: string;
  allow_download?: boolean;
  xp: number;
  duration_minutes?: number | null;
  sort_order?: number;
  is_active: boolean;
};
