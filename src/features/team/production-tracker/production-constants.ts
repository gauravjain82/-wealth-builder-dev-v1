export const PRODUCTION_TABLE_STATUS_OPTIONS = [
  'Complete',
  'Pending',
  'Issue',
  'Incomplete',
  'Trial',
  'Chargeback',
] as const;

/** Status options for the Add/Edit Production modal. Values match v2 API machine values. */
export const PRODUCTION_MODAL_STATUS_OPTIONS = [
  { label: 'Pending',     value: 'IN_PROGRESS' },
  { label: 'Lead',        value: 'LEAD' },
  { label: 'Submitted',   value: 'SUBMITTED' },
  { label: 'Trial',       value: 'TRIAL' },
  { label: 'Approved',    value: 'APPROVED' },
  { label: 'Issued',      value: 'ISSUED' },
  { label: 'Completed',   value: 'COMPLETED' },
  { label: 'Declined',    value: 'DECLINED' },
  { label: 'Cancelled',   value: 'CANCELLED' },
] as const;

export const PRODUCTION_TABLE_DELIVERY_OPTIONS = [
  'Approved',
  'Issued',
  'PDR',
  'Sent to TFA',
  'Pending',
] as const;

export const PRODUCTION_MODAL_DELIVERY_OPTIONS = ['Email', 'Mail', 'In Person', 'Digital'] as const;
