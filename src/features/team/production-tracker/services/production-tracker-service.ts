import {
  PRODUCTION_MODAL_DELIVERY_OPTIONS,
  PRODUCTION_TABLE_DELIVERY_OPTIONS,
} from '../production-constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ProductionTrackerRecord {
  id: number;
  uuid?: string;
  prospect: number | null;
  client_name: string;
  client_display?: string;
  date_written: string | null;
  closure_date: string | null;
  issued_date?: string | null;
  approved_date?: string | null;
  delivery_date?: string | null;
  pdr_date?: string | null;
  sent_to_tfa_date?: string | null;
  delivery: string;
  policy_delivery_mode?: string;
  policy_delivery_status?: string;
  policy_status?: string;
  status: string;
  status_display?: string;
  notes: string;
  latest_note_text?: string;
  latest_note_tracker?: string;
  latest_note_created_by_name?: string;
  latest_note_created_at?: string;
  trial_app: boolean;
  chargeback: boolean;
  chargeback_deposited_12_months: boolean;
  chargeback_deposited_26_months: boolean;
  policy_company: string;
  policy_number: string;
  policy_product: string;
  policy_other_product: string;
  company_product_id?: number | null;
  company_product_display?: string;
  multiplier_snapshot?: string;
  base_points?: string;
  points_forty: number | string | null;
  points_sixty: number | string | null;
  points_target: number | string | null;
  agent_1: number | null;
  agent_1_name: string;
  agent_1_pct: number;
  agent_1_points_target?: number | string | null;
  agent_1_points_forty?: number | string | null;
  agent_1_points_sixty?: number | string | null;
  agent_2: number | null;
  agent_2_name: string;
  agent_2_pct: number;
  agent_2_points_target?: number | string | null;
  agent_2_points_forty?: number | string | null;
  agent_2_points_sixty?: number | string | null;
  split_mode: 'split' | 'solo';
  advance_first_date: string | null;
  advance_first_amount: number | string | null;
  advance_second_date: string | null;
  advance_second_amount: number | string | null;
  files: string[];
  chargeback_info?: ChargebackInfo;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ─── V2 Policy interfaces ────────────────────────────────────────────────────

export interface PolicyAgentSplit {
  id: number;
  agent: number;
  agent_name: string;
  split_percentage: string;
  calculated_points?: number | string | null;
  first_advance_points?: number | string | null;
  second_advance_points?: number | string | null;
  created_at: string;
}

export interface Policy {
  id: number;
  uuid: string;
  status: string;
  status_display: string;
  client: number | null;
  client_name: string;
  client_display: string;
  company_product: number | null;
  company_product_display: string;
  multiplier_snapshot: string;
  base_points: string;
  policy_number: string;
  is_trial_app: boolean;
  date_written: string | null;
  closure_date: string | null;
  issued_date: string | null;
  policy_delivery_mode: string;
  policy_delivery_status: string;
  agent_splits: PolicyAgentSplit[];
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyAdvance {
  id: number;
  advance_type: 'FIRST' | 'SECOND' | 'FULL';
  advance_type_display: string;
  percentage: string;
  paid_date: string;
  created_at: string;
}

export interface ChargebackOption {
  type: string;
  label: string;
  percentage: number;
}

export interface ChargebackInfo {
  months_elapsed: number;
  eligible_options: ChargebackOption[];
  selection: string | null;
}

export interface PolicyAdvancePointsBreakdown {
  first_40?: number | string | null;
  second_60?: number | string | null;
  full_100?: number | string | null;
}

export interface PolicyLatestNote {
  id: number;
  text: string;
  created_by_name?: string;
  created_at?: string;
}

export interface PolicyChargeback {
  id: number;
  chargeback_type: 'FULL' | 'HALF' | 'NONE';
  chargeback_type_display: string;
  chargeback_date: string;
  months_completed: number;
  calculated_percentage: number;
  created_at: string;
}

export interface PolicyAttachment {
  id: number;
  file_name: string;
  url: string;
  uploaded_at: string;
}

export interface PolicyNote {
  id: number;
  text: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export interface LedgerEntry {
  id: number;
  user: number;
  user_name: string;
  entry_type: 'PROJECTED' | 'ADVANCE' | 'CHARGEBACK' | 'REVERSAL';
  entry_type_display: string;
  points: string;
  effective_date: string;
  created_at: string;
}

export interface CreatePolicyAgentSplit {
  agent: number;
  split_percentage: string;
}

export interface ProductionPointsSummaryBucket {
  projected: string;
  advance: string;
  chargeback: string;
  net: string;
}

export interface ProductionPointsSummary {
  user_id: number;
  personal: ProductionPointsSummaryBucket;
  baseshop: ProductionPointsSummaryBucket;
  npr: string;
}

export interface ProductionTopPerformer {
  rank: number;
  user_id: number;
  user_name: string;
  advance: string;
  chargeback: string;
  net: string;
  npr: string;
}

export interface ProductionCompanyProduct {
  id: number;
  company_name: string;
  product_name: string;
  multiplier: number | string;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
}

export interface ProductionSplitPreset {
  label: string;
  agents: number;
  splits: number[];
}

interface PaginatedProductionResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BackendProductionTrackerRecord[];
}

type BackendProductionTrackerRecord = Record<string, unknown>;

export interface ProductionTrackerQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: Record<string, string>;
}

export interface ProductionTrackerPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductionTrackerRecord[];
}

const DELIVERY_STATUS_VALUES = new Set<string>(PRODUCTION_TABLE_DELIVERY_OPTIONS);
const DELIVERY_MODE_VALUES = new Set<string>(PRODUCTION_MODAL_DELIVERY_OPTIONS);

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function toBooleanValue(value: unknown): boolean {
  return Boolean(value);
}

// Sort / filter key mapping for GET /api/tracker/policies/
function mapSortKey(sort?: string): string | undefined {
  if (!sort) return undefined;
  const descending = sort.startsWith('-');
  const key = descending ? sort.slice(1) : sort;
  const mapped: Record<string, string> = {
    delivery: 'policy_delivery_status',
    trial_app: 'is_trial_app',
    points_target: 'base_points',
    points_forty: 'base_points',
    points_sixty: 'base_points',
    policy_company: 'company_product__company_name',
    policy_product: 'company_product__product_name',
    prospect: 'client',
  };
  const resolved = mapped[key] ?? key;
  return descending ? `-${resolved}` : resolved;
}

function mapFilterKey(key: string): string {
  const mapped: Record<string, string> = {
    delivery: 'policy_delivery_status',
    trial_app: 'is_trial_app',
    points_target: 'base_points',
    policy_company: 'company_product',
    policy_product: 'company_product',
    prospect: 'client',
  };
  return mapped[key] ?? key;
}

// Parse "Transamerica — FFIUL II (×1.2500)" into company and product parts
function parseCompanyProductDisplay(display: string): { company: string; product: string } {
  const em = ' \u2014 ';
  const dashIdx = display.indexOf(em);
  if (dashIdx === -1) return { company: display, product: '' };
  const company = display.slice(0, dashIdx);
  let product = display.slice(dashIdx + em.length);
  const multiIdx = product.lastIndexOf(' (\u00d7');
  if (multiIdx !== -1) product = product.slice(0, multiIdx);
  return { company, product };
}

function normalizeProductionRecord(record: BackendProductionTrackerRecord): ProductionTrackerRecord {
  // Detect v2 Policy response shape (has agent_splits array and company_product_display)
  const isV2 = Array.isArray(record.agent_splits) || 'company_product_display' in record;

  if (isV2) {
    const splits = Array.isArray(record.agent_splits)
      ? (record.agent_splits as PolicyAgentSplit[])
      : [];
    const latestNote =
      record.latest_note && typeof record.latest_note === 'object'
        ? (record.latest_note as PolicyLatestNote)
        : null;
    const advancePointsBreakdown =
      record.advance_points_breakdown && typeof record.advance_points_breakdown === 'object'
        ? (record.advance_points_breakdown as PolicyAdvancePointsBreakdown)
        : null;
    const advances = Array.isArray(record.advances)
      ? (record.advances as PolicyAdvance[])
      : [];
    const split1 = splits[0] ?? null;
    const split2 = splits[1] ?? null;
    const firstAdvance =
      advances.find((item) => item.advance_type === 'FIRST' || item.advance_type === 'FULL') ?? null;
    const secondAdvance =
      advances.find((item) => item.advance_type === 'SECOND') ?? null;
    const display = toStringValue(record.company_product_display);
    const { company, product } = display ? parseCompanyProductDisplay(display) : { company: '', product: '' };
    const basePointsNumeric = Number(record.base_points);
    const toAdvanceAmount = (advance: PolicyAdvance | null): number | null => {
      if (!advance) return null;
      const pct = Number(advance.percentage);
      if (!Number.isFinite(basePointsNumeric) || !Number.isFinite(pct)) return null;
      return Number(((basePointsNumeric * pct) / 100).toFixed(2));
    };

    return {
      id: Number(record.id),
      uuid: toStringValue(record.uuid) || undefined,
      prospect: (record.client as number | null | undefined) ?? null,
      client_name: toStringValue(record.client_display) || toStringValue(record.client_name),
      client_display: toStringValue(record.client_display) || undefined,
      date_written: toNullableString(record.date_written),
      closure_date: toNullableString(record.closure_date),
      issued_date: toNullableString(record.issued_date),
      approved_date: toNullableString(record.approved_date),
      delivery_date: toNullableString(record.delivery_date),
      pdr_date: toNullableString(record.pdr_date),
      sent_to_tfa_date: toNullableString(record.sent_to_tfa_date),
      delivery: toStringValue(record.policy_delivery_status) || toStringValue(record.policy_delivery_mode),
      policy_delivery_mode: toStringValue(record.policy_delivery_mode) || undefined,
      policy_delivery_status: toStringValue(record.policy_delivery_status) || undefined,
      status: toStringValue(record.status),
      status_display: toStringValue(record.status_display) || undefined,
      notes: toStringValue(record.notes),
      latest_note_text: toStringValue(latestNote?.text) || toStringValue(record.latest_note_text) || undefined,
      latest_note_tracker: toStringValue(record.latest_note_tracker) || 'production',
      latest_note_created_by_name:
        toStringValue(latestNote?.created_by_name) || toStringValue(record.latest_note_created_by_name) || undefined,
      latest_note_created_at:
        toStringValue(latestNote?.created_at) || toStringValue(record.latest_note_created_at) || undefined,
      trial_app: toBooleanValue(record.is_trial_app),
      chargeback: toStringValue(record.status) === 'CHARGEBACK',
      chargeback_deposited_12_months: false,
      chargeback_deposited_26_months: false,
      policy_company: company,
      policy_number: toStringValue(record.policy_number),
      policy_product: product,
      policy_other_product: '',
      company_product_id: (record.company_product as number | null | undefined) ?? null,
      company_product_display: display || undefined,
      multiplier_snapshot: toStringValue(record.multiplier_snapshot) || undefined,
      base_points: toStringValue(record.base_points) || undefined,
      points_target:
        advancePointsBreakdown?.full_100 ??
        (record.points_target as number | string | null | undefined) ??
        (record.base_points as number | string | null | undefined) ??
        null,
      points_forty:
        advancePointsBreakdown?.first_40 ??
        (record.points_forty as number | string | null | undefined) ??
        (record.split_1_percentage_points as number | string | null | undefined) ??
        null,
      points_sixty:
        advancePointsBreakdown?.second_60 ??
        (record.points_sixty as number | string | null | undefined) ??
        (record.split_2_percentage_points as number | string | null | undefined) ??
        null,
      agent_1: split1 ? split1.agent : null,
      agent_1_name: split1 ? split1.agent_name : '',
      agent_1_pct: split1 ? Number(split1.split_percentage) : 100,
      agent_1_points_target: split1?.calculated_points ?? null,
      agent_1_points_forty: split1?.first_advance_points ?? null,
      agent_1_points_sixty: split1?.second_advance_points ?? null,
      agent_2: split2 ? split2.agent : null,
      agent_2_name: split2 ? split2.agent_name : '',
      agent_2_pct: split2 ? Number(split2.split_percentage) : 0,
      agent_2_points_target: split2?.calculated_points ?? null,
      agent_2_points_forty: split2?.first_advance_points ?? null,
      agent_2_points_sixty: split2?.second_advance_points ?? null,
      split_mode: splits.length > 1 ? 'split' : 'solo',
      advance_first_date: firstAdvance?.paid_date || toNullableString(record.advance_first_date),
      advance_first_amount: toAdvanceAmount(firstAdvance) ?? (record.advance_first_amount as number | string | null | undefined) ?? null,
      advance_second_date: secondAdvance?.paid_date || toNullableString(record.advance_second_date),
      advance_second_amount: toAdvanceAmount(secondAdvance) ?? (record.advance_second_amount as number | string | null | undefined) ?? null,
      files: Array.isArray(record.files) ? (record.files as string[]) : [],
      chargeback_info:
        record.chargeback_info && typeof record.chargeback_info === 'object'
          ? (record.chargeback_info as ChargebackInfo)
          : undefined,
      created_by: (record.created_by as number | null | undefined) ?? null,
      created_at: toStringValue(record.created_at),
      updated_at: toStringValue(record.updated_at),
    };
  }

  // Legacy /api/tracker/production/ response shape
  const policyCompany = toStringValue(record.policy_company) || toStringValue(record.policy_company_name);
  const policyProduct = toStringValue(record.policy_product) || toStringValue(record.policy_product_name);
  const isOtherProduct = policyCompany === 'OTHER' || policyProduct === 'OTHER';

  return {
    id: Number(record.id),
    prospect: (record.prospect as number | null | undefined) ?? null,
    client_name: toStringValue(record.client_name),
    date_written: toNullableString(record.date_written),
    closure_date: toNullableString(record.closure_date),
    issued_date: toNullableString(record.issued_date),
    approved_date: toNullableString(record.approved_date),
    delivery_date: toNullableString(record.delivery_date),
    pdr_date: toNullableString(record.pdr_date),
    sent_to_tfa_date: toNullableString(record.sent_to_tfa_date),
    delivery:
      toStringValue(record.delivery) ||
      toStringValue(record.policy_delivery_status) ||
      toStringValue(record.policy_delivery_mode),
    status: toStringValue(record.status) || toStringValue(record.policy_status),
    notes: toStringValue(record.notes),
    latest_note_text: toStringValue(record.latest_note_text) || undefined,
    latest_note_tracker: toStringValue(record.latest_note_tracker) || undefined,
    latest_note_created_by_name: toStringValue(record.latest_note_created_by_name) || undefined,
    latest_note_created_at: toStringValue(record.latest_note_created_at) || undefined,
    trial_app: record.trial_app !== undefined ? toBooleanValue(record.trial_app) : toBooleanValue(record.is_trial_app),
    chargeback: toBooleanValue(record.chargeback),
    chargeback_deposited_12_months: toBooleanValue(record.chargeback_deposited_12_months),
    chargeback_deposited_26_months: toBooleanValue(record.chargeback_deposited_26_months),
    policy_company: policyCompany,
    policy_number: toStringValue(record.policy_number),
    policy_product: policyProduct,
    policy_other_product:
      toStringValue(record.policy_other_product) || (isOtherProduct ? policyProduct : ''),
    points_forty: (record.points_forty as number | string | null | undefined) ?? (record.split_1_percentage_points as number | string | null | undefined) ?? null,
    points_sixty: (record.points_sixty as number | string | null | undefined) ?? (record.split_2_percentage_points as number | string | null | undefined) ?? null,
    points_target: (record.points_target as number | string | null | undefined) ?? (record.target_amount as number | string | null | undefined) ?? null,
    agent_1: (record.agent_1 as number | null | undefined) ?? null,
    agent_1_name: toStringValue(record.agent_1_name),
    agent_1_pct: Number(record.agent_1_pct ?? 100),
    agent_1_points_target: (record.agent_1_points_target as number | string | null | undefined) ?? null,
    agent_1_points_forty: (record.agent_1_points_forty as number | string | null | undefined) ?? null,
    agent_1_points_sixty: (record.agent_1_points_sixty as number | string | null | undefined) ?? null,
    agent_2: (record.agent_2 as number | null | undefined) ?? null,
    agent_2_name: toStringValue(record.agent_2_name),
    agent_2_pct: Number(record.agent_2_pct ?? 0),
    agent_2_points_target: (record.agent_2_points_target as number | string | null | undefined) ?? null,
    agent_2_points_forty: (record.agent_2_points_forty as number | string | null | undefined) ?? null,
    agent_2_points_sixty: (record.agent_2_points_sixty as number | string | null | undefined) ?? null,
    split_mode: (record.split_mode as 'split' | 'solo' | undefined) || 'solo',
    advance_first_date: toNullableString(record.advance_first_date),
    advance_first_amount: (record.advance_first_amount as number | string | null | undefined) ?? null,
    advance_second_date: toNullableString(record.advance_second_date),
    advance_second_amount: (record.advance_second_amount as number | string | null | undefined) ?? null,
    files: Array.isArray(record.files) ? (record.files as string[]) : [],
    chargeback_info:
      record.chargeback_info && typeof record.chargeback_info === 'object'
        ? (record.chargeback_info as ChargebackInfo)
        : undefined,
    created_by: (record.created_by as number | null | undefined) ?? null,
    created_at: toStringValue(record.created_at),
    updated_at: toStringValue(record.updated_at),
  };
}

// Build a v2 /api/tracker/policies/ compatible payload from UI fields
function toBackendPayload(payload: CreateProductionPayload | UpdateProductionPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  // Client
  if ('prospect' in payload) out.client = payload.prospect;
  if ('client_name' in payload) out.client_name = payload.client_name;

  // Company product FK (v2 uses integer ID)
  if ('company_product_id' in payload) out.company_product = payload.company_product_id;

  // Points: map points_target → base_points (string, as API expects)
  if ('points_target' in payload) {
    out.base_points = payload.points_target != null ? String(payload.points_target) : null;
  }

  // Status
  if ('status' in payload) out.status = payload.status;

  // Trial app
  if ('trial_app' in payload) out.is_trial_app = payload.trial_app;

  // Dates
  if ('date_written' in payload) out.date_written = payload.date_written;
  if ('closure_date' in payload) out.closure_date = payload.closure_date;
  if ('advance_first_date' in payload) out.advance_first_date = payload.advance_first_date;
  if ('advance_second_date' in payload) out.advance_second_date = payload.advance_second_date;
  if ('advance_first_amount' in payload) out.advance_first_amount = payload.advance_first_amount;
  if ('advance_second_amount' in payload) out.advance_second_amount = payload.advance_second_amount;

  // Delivery dates
  if ('issued_date' in payload) out.issued_date = payload.issued_date;
  if ('approved_date' in payload) out.approved_date = payload.approved_date;
  if ('delivery_date' in payload) out.delivery_date = payload.delivery_date;
  if ('pdr_date' in payload) out.pdr_date = payload.pdr_date;
  if ('sent_to_tfa_date' in payload) out.sent_to_tfa_date = payload.sent_to_tfa_date;

  // Policy number
  if ('policy_number' in payload) out.policy_number = payload.policy_number;

  // Delivery: split into mode and status
  if ('delivery' in payload && typeof payload.delivery === 'string') {
    if (DELIVERY_STATUS_VALUES.has(payload.delivery)) out.policy_delivery_status = payload.delivery;
    if (DELIVERY_MODE_VALUES.has(payload.delivery)) out.policy_delivery_mode = payload.delivery;
  }
  if ('policy_delivery_mode' in payload) out.policy_delivery_mode = payload.policy_delivery_mode;
  if ('policy_delivery_status' in payload) out.policy_delivery_status = payload.policy_delivery_status;

  // Notes
  if ('notes' in payload) out.notes = payload.notes;

  // Chargeback flags (legacy — no-op on v2 but harmless)
  if ('chargeback' in payload) out.chargeback = payload.chargeback;
  if ('chargeback_deposited_12_months' in payload) out.chargeback_deposited_12_months = payload.chargeback_deposited_12_months;
  if ('chargeback_deposited_26_months' in payload) out.chargeback_deposited_26_months = payload.chargeback_deposited_26_months;

  // Agent splits: build array from agent_1/agent_2 fields
  const agent1 = payload.agent_1;
  const agent1Pct = payload.agent_1_pct;
  if (agent1 != null && agent1Pct != null) {
    const splits: Array<{ agent: number; split_percentage: string }> = [
      { agent: agent1, split_percentage: String(agent1Pct) },
    ];
    if (payload.split_mode === 'split' && payload.agent_2 != null && payload.agent_2_pct != null) {
      splits.push({ agent: payload.agent_2, split_percentage: String(payload.agent_2_pct) });
    }
    out.agent_splits = splits;
  }

  return out;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface CreateProductionPayload {
  prospect?: number | null;
  client_name: string;
  /** v2: FK ID for CompanyProduct. Send null for "OTHER" company. */
  company_product_id?: number | null;
  date_written?: string | null;
  closure_date?: string | null;
  delivery?: string;
  policy_delivery_mode?: string;
  policy_delivery_status?: string;
  policy_status?: string;
  status?: string;
  notes?: string;
  trial_app?: boolean;
  chargeback?: boolean;
  chargeback_deposited_12_months?: boolean;
  chargeback_deposited_26_months?: boolean;
  policy_company?: string;
  policy_number?: string;
  policy_product?: string;
  policy_other_product?: string;
  points_target?: number | null;
  points_forty?: number | null;
  points_sixty?: number | null;
  agent_1?: number | null;
  agent_1_name?: string;
  agent_1_pct?: number;
  agent_2?: number | null;
  agent_2_name?: string;
  agent_2_pct?: number;
  split_mode?: 'split' | 'solo';
  advance_first_date?: string | null;
  advance_first_amount?: number | null;
  advance_second_date?: string | null;
  advance_second_amount?: number | null;
  issued_date?: string | null;
  approved_date?: string | null;
  delivery_date?: string | null;
  pdr_date?: string | null;
  sent_to_tfa_date?: string | null;
}

export type UpdateProductionPayload = Partial<CreateProductionPayload>;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function createProductionRecord(payload: CreateProductionPayload): Promise<ProductionTrackerRecord> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/tracker/policies/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(toBackendPayload(payload)),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create production record: ${text}`);
  }
  return normalizeProductionRecord((await response.json()) as BackendProductionTrackerRecord);
}

export async function fetchProductionTracker(
  query: ProductionTrackerQuery = {}
): Promise<ProductionTrackerPage> {
  const headers = getAuthHeaders();
  const params = new URLSearchParams();
  params.set('page_size', String(query.pageSize ?? 10));
  if (query.page && query.page > 0) {
    params.set('page', String(query.page));
  }
  if (query.sort) {
    params.set('sort', mapSortKey(query.sort) || query.sort);
  }
  if (query.filters) {
    Object.entries(query.filters).forEach(([key, value]) => {
      const normalized = value?.trim();
      if (!normalized) return;
      params.set(mapFilterKey(key), normalized);
    });
  }

  const response = await fetch(`${API_BASE_URL}/api/tracker/policies/?${params.toString()}`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch production tracker: ${response.statusText}`);
  }

  const data = (await response.json()) as PaginatedProductionResponse | BackendProductionTrackerRecord[];

  if (Array.isArray(data)) {
    const results = data.map(normalizeProductionRecord);
    return {
      count: results.length,
      next: null,
      previous: null,
      results,
    };
  }

  return {
    count: data.count,
    next: data.next,
    previous: data.previous,
    results: data.results.map((record) => normalizeProductionRecord(record as BackendProductionTrackerRecord)),
  };
}

export async function updateProductionRecord(
  recordId: number,
  payload: UpdateProductionPayload
): Promise<ProductionTrackerRecord> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/tracker/policies/${recordId}/`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(toBackendPayload(payload)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update production record: ${text}`);
  }

  return normalizeProductionRecord((await response.json()) as BackendProductionTrackerRecord);
}

export async function deleteProductionRecord(recordId: number): Promise<void> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/tracker/policies/${recordId}/`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete production record: ${text}`);
  }
}

export async function fetchProductionPointsSummary(userId?: number | null): Promise<ProductionPointsSummary> {
  const params = new URLSearchParams();
  if (userId) {
    params.set('user_id', String(userId));
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetchJson<ProductionPointsSummary>(`${API_BASE_URL}/api/tracker/policies/points_summary/${suffix}`);
}

export async function fetchProductionCompanyProducts(): Promise<ProductionCompanyProduct[]> {
  const data = await fetchJson<
    ProductionCompanyProduct[] | { count: number; results: ProductionCompanyProduct[] }
  >(`${API_BASE_URL}/api/tracker/company-products/`);
  return Array.isArray(data) ? data : ((data as { results: ProductionCompanyProduct[] }).results ?? []);
}

export async function fetchProductionSplitPresets(): Promise<ProductionSplitPreset[]> {
  const data = await fetchJson<
    ProductionSplitPreset[] | { count: number; results: ProductionSplitPreset[] }
  >(`${API_BASE_URL}/api/tracker/policies/split_presets/`);
  return Array.isArray(data) ? data : ((data as { results: ProductionSplitPreset[] }).results ?? []);
}

export async function fetchProductionTopPerformers(): Promise<ProductionTopPerformer[]> {
  const data = await fetchJson<
    ProductionTopPerformer[] | { count: number; results: ProductionTopPerformer[] }
  >(`${API_BASE_URL}/api/tracker/policies/top_performers/`);
  return Array.isArray(data) ? data : ((data as { results: ProductionTopPerformer[] }).results ?? []);
}

// ─── Policy (v2) CRUD ─────────────────────────────────────────────────────────

/** GET /api/tracker/policies/{id}/ */
export async function fetchPolicy(policyId: number): Promise<Policy> {
  return fetchJson<Policy>(`${API_BASE_URL}/api/tracker/policies/${policyId}/`);
}

// ─── Status transitions ────────────────────────────────────────────────────────

/** POST /api/tracker/policies/{id}/transition/
 *  Move policy to a new status value (e.g. "SUBMITTED", "ISSUED").
 *  Invalid transitions return 400. */
export async function transitionPolicyStatus(policyId: number, status: string): Promise<Policy> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/policies/${policyId}/transition/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to transition policy status: ${text}`);
  }
  return (await response.json()) as Policy;
}

// ─── Agent splits ──────────────────────────────────────────────────────────────

/** GET /api/tracker/policies/{id}/splits/ */
export async function listPolicySplits(policyId: number): Promise<PolicyAgentSplit[]> {
  return fetchJson<PolicyAgentSplit[]>(`${API_BASE_URL}/api/tracker/policies/${policyId}/splits/`);
}

/** POST /api/tracker/policies/{id}/set_splits/
 *  Atomically replaces all agent splits. Blocked after any advance has been recorded. */
export async function setPolicySplits(
  policyId: number,
  agentSplits: CreatePolicyAgentSplit[]
): Promise<PolicyAgentSplit[]> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/policies/${policyId}/set_splits/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ agent_splits: agentSplits }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to set policy splits: ${text}`);
  }
  return (await response.json()) as PolicyAgentSplit[];
}

// ─── Advance payments ─────────────────────────────────────────────────────────

/** GET /api/tracker/policies/{id}/advances/ */
export async function listPolicyAdvances(policyId: number): Promise<PolicyAdvance[]> {
  return fetchJson<PolicyAdvance[]>(`${API_BASE_URL}/api/tracker/policies/${policyId}/advances/`);
}

/** POST /api/tracker/policies/{id}/advances/
 *  Record an advance payment. Trial apps cannot have advances (400).
 *  @param percentage - stored as-is, e.g. "40.00". Pre-fill by type but keep editable. */
export async function recordPolicyAdvance(
  policyId: number,
  advance: { advance_type: 'FIRST' | 'SECOND' | 'FULL'; percentage: string; paid_date: string }
): Promise<PolicyAdvance> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/policies/${policyId}/advances/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(advance),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to record advance: ${text}`);
  }
  return (await response.json()) as PolicyAdvance;
}

// ─── Chargebacks ──────────────────────────────────────────────────────────────

/** GET /api/tracker/policies/{id}/chargebacks/ */
export async function listPolicyChargebacks(policyId: number): Promise<PolicyChargeback[]> {
  return fetchJson<PolicyChargeback[]>(`${API_BASE_URL}/api/tracker/policies/${policyId}/chargebacks/`);
}

/** POST /api/tracker/policies/{id}/chargebacks/
 *  Sets or updates chargeback selection based on eligible options
 *  Accepts chargebackType: string (e.g. 'FULL', 'HALF') or null to remove */
export async function recordPolicyChargeback(
  policyId: number,
  chargebackType: string | null
): Promise<any> {
  if (chargebackType === null) {
    // Backend DELETE requires chargeback id: /chargebacks/{chargeback_id}/
    const existing = await listPolicyChargebacks(policyId);
    if (!existing.length) return { success: true };

    const chargebackToDelete = existing[existing.length - 1];
    const response = await fetch(`${API_BASE_URL}/api/tracker/policies/${policyId}/chargebacks/${chargebackToDelete.id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to remove chargeback: ${text}`);
    }
    return { success: true };
  } else {
    // POST request to set chargeback
    const response = await fetch(`${API_BASE_URL}/api/tracker/policies/${policyId}/chargebacks/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ chargeback_type: chargebackType }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to set chargeback: ${text}`);
    }
    return (await response.json()) as PolicyChargeback;
  }
}

// ─── Attachments (GCS) ────────────────────────────────────────────────────────

/** GET /api/tracker/policies/{id}/attachments/
 *  Signed URLs expire in 60 min — always re-fetch, never cache. */
export async function listPolicyAttachments(policyId: number): Promise<PolicyAttachment[]> {
  return fetchJson<PolicyAttachment[]>(`${API_BASE_URL}/api/tracker/policies/${policyId}/attachments/`);
}

/** POST /api/tracker/policies/{id}/attachments/ (multipart/form-data, field: "file") */
export async function uploadPolicyAttachment(policyId: number, file: File): Promise<PolicyAttachment> {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/tracker/policies/${policyId}/attachments/`, {
    method: 'POST',
    headers: { Authorization: `Token ${token}` }, // no Content-Type — browser sets multipart boundary
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to upload attachment: ${text}`);
  }
  return (await response.json()) as PolicyAttachment;
}

/** DELETE /api/tracker/policies/{id}/attachments/{attachmentId}/ */
export async function deletePolicyAttachment(policyId: number, attachmentId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/tracker/policies/${policyId}/attachments/${attachmentId}/`,
    { method: 'DELETE', headers: getAuthHeaders() }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete attachment: ${text}`);
  }
}

// ─── Notes ────────────────────────────────────────────────────────────────────

/** GET /api/tracker/policies/{id}/notes/
 *  Notes are linked to policy.client (FK). Policies with only client_name (text) have no notes. */
export async function listPolicyNotes(policyId: number): Promise<PolicyNote[]> {
  return fetchJson<PolicyNote[]>(`${API_BASE_URL}/api/tracker/policies/${policyId}/notes/`);
}

/** POST /api/tracker/policies/{id}/notes/ */
export async function addPolicyNote(policyId: number, text: string): Promise<PolicyNote> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/policies/${policyId}/notes/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    const text2 = await response.text();
    throw new Error(`Failed to add note: ${text2}`);
  }
  return (await response.json()) as PolicyNote;
}

// ─── Point Ledger (read-only source of truth) ─────────────────────────────────

/** GET /api/tracker/policies/{id}/ledger/
 *  Returns all ledger entries in chronological order.
 *  Derive all point totals from this — never from other model fields. */
export async function fetchPolicyLedger(policyId: number): Promise<LedgerEntry[]> {
  return fetchJson<LedgerEntry[]>(`${API_BASE_URL}/api/tracker/policies/${policyId}/ledger/`);
}
