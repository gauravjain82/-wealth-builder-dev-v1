import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  DatePicker,
  FormActions,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
  UserAutocompleteDropdown,
  type UserAutocompleteOption,
} from '@/shared/components';
import {
  PRODUCTION_MODAL_DELIVERY_OPTIONS,
  PRODUCTION_MODAL_STATUS_OPTIONS,
} from '@/features/team/production-tracker/production-constants';
import type { Prospect } from '../services/prospect-service';

export interface AddProductionFormData {
  status: string;
  dateWritten: string;
  closureDate: string;
  client: string;
  agentMode: 'single' | 'split';
  agent1Id: number | null;
  agent1Name: string;
  agent2Id: number | null;
  agent2Name: string;
  agent1Pct: number;
  agent2Pct: number;
  split: string;
  targetPoints: string;
  multiplierPercent: string;
  company: string;
  product: string;
  otherProduct: string;
  policyNumber: string;
  delivery: string;
  trialApp: boolean;
  notes: string;
}

interface AddProductionModalProps {
  open: boolean;
  saving: boolean;
  prospect: Prospect | null;
  title?: string;
  submitLabel?: string;
  initialForm?: AddProductionFormData | null;
  companyOptions?: readonly string[];
  productsByCompany?: Record<string, string[]>;
  splitOptions?: readonly string[];
  multiplierTable?: Record<string, number>;
  onClose: () => void;
  onSubmit: (data: AddProductionFormData) => Promise<void>;
}

const defaultForm = (): AddProductionFormData => ({
  status: 'IN_PROGRESS',
  dateWritten: new Date().toISOString().split('T')[0],
  closureDate: '',
  client: '',
  agentMode: 'single',
  agent1Id: null,
  agent1Name: '',
  agent2Id: null,
  agent2Name: '',
  agent1Pct: 100,
  agent2Pct: 0,
  split: '100/0',
  targetPoints: '',
  multiplierPercent: '',
  company: '',
  product: '',
  otherProduct: '',
  policyNumber: '',
  delivery: 'Email',
  trialApp: false,
  notes: '',
});

export function AddProductionModal({
  open,
  saving,
  prospect,
  title = 'Add Production',
  submitLabel = 'Add to Production',
  initialForm,
  companyOptions = [],
  productsByCompany = {},
  splitOptions = [],
  multiplierTable = {},
  onClose,
  onSubmit,
}: AddProductionModalProps) {
  const [form, setForm] = useState<AddProductionFormData>(defaultForm());

  useEffect(() => {
    if (!open) return;

    if (initialForm) {
      setForm(initialForm);
      return;
    }

    setForm({
      ...defaultForm(),
      client: prospect?.full_name || '',
      agent1Name: prospect?.recruited_by_name || '',
      agent1Id: prospect?.recruited_by ?? null,
      agent2Name: prospect?.leader_name || '',
      agent2Id: prospect?.leader ?? null,
    });
  }, [open, prospect, initialForm]);

  const update = <K extends keyof AddProductionFormData>(key: K, value: AddProductionFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAgentModeChange = (mode: 'single' | 'split') => {
    if (mode === 'single') {
      setForm((prev) => ({ ...prev, agentMode: 'single', agent1Pct: 100, agent2Pct: 0, split: '100/0' }));
    } else {
      setForm((prev) => ({ ...prev, agentMode: 'split', agent1Pct: 50, agent2Pct: 50, split: '50/50' }));
    }
  };

  const handleSplitChange = (splitValue: string) => {
    const [p1, p2] = splitValue.split('/').map((v) => parseFloat(v) || 0);
    setForm((prev) => ({ ...prev, split: splitValue, agent1Pct: p1, agent2Pct: p2 }));
  };

  const getMultiplier = (): number => {
    if (form.company === 'OTHER' || form.product === 'OTHER') {
      const pct = parseFloat(form.multiplierPercent);
      return isNaN(pct) ? 1 : pct;
    }
    return multiplierTable[`${form.company}|${form.product}`] ?? 1;
  };

  const points = useMemo(() => {
    const base = parseFloat(form.targetPoints) || 0;
    const multiplier = getMultiplier();
    const total = Math.round(base * multiplier * 100) / 100;
    const [pA, pB] = form.split.split('/').map((v) => parseFloat(v) || 0);
    return {
      total,
      pointsA: Math.round(total * (pA / 100) * 100) / 100,
      pointsB: Math.round(total * (pB / 100) * 100) / 100,
      labelA: `${pA}% Points`,
      labelB: `${pB}% Points`,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.targetPoints, form.company, form.product, form.multiplierPercent, form.split]);

  const handleSubmit = async () => {
    await onSubmit(form);
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      contentClassName="max-w-[760px] flex flex-col max-h-[90vh]"
    >
      <form
        onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid gap-4">
        {/* Basic Info */}
        <p className="text-sm font-semibold text-[#d4af37]">Basic Info</p>
        <FormRowGroup columns={3}>
          <FormRow>
            <Label variant="form">Status</Label>
            <Select value={form.status} onChange={(e) => update('status', e.target.value)}>
              {PRODUCTION_MODAL_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Label variant="form">Date Written*</Label>
            <DatePicker
              value={form.dateWritten}
              onChange={(v) => update('dateWritten', v)}
            />
          </FormRow>
          <FormRow>
            <Label variant="form">Closure Date</Label>
            <DatePicker
              value={form.closureDate}
              onChange={(v) => update('closureDate', v)}
            />
          </FormRow>
        </FormRowGroup>
        <FormRowGroup columns={1}>
          <FormRow>
            <Label variant="form">Client*</Label>
            <Input
              type="text"
              placeholder="Client name"
              value={form.client}
              onChange={(e) => update('client', e.target.value)}
            />
          </FormRow>
        </FormRowGroup>

        {/* Agents & Share */}
        <p className="text-sm font-semibold text-[#d4af37]">Agents &amp; Share</p>
        <FormRowGroup columns={1}>
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="agent-mode"
                value="single"
                checked={form.agentMode === 'single'}
                onChange={() => handleAgentModeChange('single')}
                className="accent-[#d4af37]"
              />
              Single Agent (100%)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="agent-mode"
                value="split"
                checked={form.agentMode === 'split'}
                onChange={() => handleAgentModeChange('split')}
                className="accent-[#d4af37]"
              />
              Split Agents
            </label>
          </div>
        </FormRowGroup>
        <FormRowGroup>
          <FormRow>
            <Label variant="form">Agent 1</Label>
            <UserAutocompleteDropdown
              fetchFromApi
              selectedId={form.agent1Id}
              selectedLabel={form.agent1Name}
              placeholder="Search agent 1..."
              onSelect={(opt: UserAutocompleteOption) =>
                setForm((prev) => ({ ...prev, agent1Id: opt.id, agent1Name: opt.label }))
              }
            />
          </FormRow>
          {form.agentMode === 'split' && (
            <FormRow>
              <Label variant="form">Agent 2</Label>
              <UserAutocompleteDropdown
                fetchFromApi
                selectedId={form.agent2Id}
                selectedLabel={form.agent2Name}
                placeholder="Search agent 2..."
                onSelect={(opt: UserAutocompleteOption) =>
                  setForm((prev) => ({ ...prev, agent2Id: opt.id, agent2Name: opt.label }))
                }
              />
            </FormRow>
          )}
          {form.agentMode === 'split' && (
            <FormRow>
              <Label variant="form">Split</Label>
              <Select value={form.split} onChange={(e) => handleSplitChange(e.target.value)}>
                {(splitOptions.length > 0 ? splitOptions : [form.split]).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
            </FormRow>
          )}
        </FormRowGroup>

        {/* Policy Details */}
        <p className="text-sm font-semibold text-[#d4af37]">Policy Details</p>
        <FormRowGroup columns={3}>
          <FormRow>
            <Label variant="form">Company</Label>
            <Select
              value={form.company}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  company: e.target.value,
                  product: '',
                  otherProduct: '',
                  multiplierPercent: '',
                }))
              }
            >
              <option value="">Select company</option>
              {(companyOptions.length > 0
                ? companyOptions
                : form.company
                ? [form.company]
                : []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Label variant="form">Product</Label>
            <Select value={form.product} onChange={(e) => update('product', e.target.value)}>
              <option value="">Select product</option>
              {((productsByCompany[form.company] || []).length > 0
                ? productsByCompany[form.company]
                : form.product
                ? [form.product]
                : []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Select>
          </FormRow>
          {form.company && form.product && (
            <FormRow>
              <Label variant="form">Multiplier</Label>
              <Input type="text" value={getMultiplier()} readOnly disabled />
            </FormRow>
          )}
        </FormRowGroup>
        {(form.product === 'OTHER' || form.company === 'OTHER') && (
          <FormRowGroup>
            <FormRow>
              <Label variant="form">Other Product</Label>
              <Input
                type="text"
                placeholder="Specify product"
                value={form.otherProduct}
                onChange={(e) => update('otherProduct', e.target.value)}
              />
            </FormRow>
            <FormRow>
              <Label variant="form">Multiplier</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 1.25"
                value={form.multiplierPercent}
                onChange={(e) => update('multiplierPercent', e.target.value)}
              />
            </FormRow>
          </FormRowGroup>
        )}
        <FormRowGroup columns={3}>
          <FormRow>
            <Label variant="form">Policy #</Label>
            <Input
              type="text"
              placeholder="Policy number"
              value={form.policyNumber}
              onChange={(e) => update('policyNumber', e.target.value)}
            />
          </FormRow>
          <FormRow>
            <Label variant="form">Delivery</Label>
            <Select value={form.delivery} onChange={(e) => update('delivery', e.target.value)}>
              {PRODUCTION_MODAL_DELIVERY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Select>
          </FormRow>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                id="trial-app"
                checked={form.trialApp}
                onChange={(e) => update('trialApp', e.target.checked)}
              />
              Trial App
            </label>
          </div>
        </FormRowGroup>

        {/* Points Calculation */}
        <p className="text-sm font-semibold text-[#d4af37]">Points Calculation</p>
        <FormRowGroup columns={2}>
          <FormRow>
            <Label variant="form">Target Amount*</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.targetPoints}
              onChange={(e) => update('targetPoints', e.target.value)}
            />
          </FormRow>
          <FormRow>
            <Label variant="form">Total Points</Label>
            <Input type="text" value={points.total} readOnly disabled />
          </FormRow>
          <FormRow>
            <Label variant="form">{points.labelA}</Label>
            <Input type="text" value={points.pointsA} readOnly disabled />
          </FormRow>
          <FormRow>
            <Label variant="form">{points.labelB}</Label>
            <Input type="text" value={points.pointsB} readOnly disabled />
          </FormRow>
        </FormRowGroup>

        {/* Notes */}
        <FormRow>
          <Label variant="form">Notes</Label>
          <Textarea
            rows={3}
            placeholder="Additional notes"
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </FormRow>
          </div>
        </div>

        {/* Pinned footer */}
        <div className="mt-4 flex-shrink-0 border-t border-slate-200 pt-4 dark:border-white/10">
          <FormActions>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : submitLabel}
            </Button>
          </FormActions>
        </div>
      </form>
    </Modal>
  );
}
