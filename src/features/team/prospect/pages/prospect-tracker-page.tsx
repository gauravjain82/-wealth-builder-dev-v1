import { useEffect, useMemo, useState } from 'react';
import { Plan } from '@/core/types';
import { TrackerTable } from '@/shared/components';
import {
  activateProspectWithAgencyCode,
  fetchProspects,
  type Prospect,
  saveProspectCallLog,
  updateProspectDetails,
} from '../../services/prospect-service';
import { AddAgencyCodeModal } from '../components/add-agency-code-modal';
import { CallLogModal } from '../components/call-log-modal';
import { buildProspectColumns } from '../prospect-columns';
import type { AddAgentFormData } from '../types';

export default function ProspectTrackerPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCallLogProspect, setActiveCallLogProspect] = useState<Prospect | null>(null);
  const [addAgencyCodeFor, setAddAgencyCodeFor] = useState<Prospect | null>(null);
  const [savingCallLog, setSavingCallLog] = useState(false);

  const resolvedPlan = useMemo(() => {
    const planFromStorage =
      localStorage.getItem('wb.plan') ||
      localStorage.getItem('wb.accountType') ||
      (() => {
        try {
          const raw = localStorage.getItem('authUser');
          if (!raw) return null;
          return JSON.parse(raw)?.accountType || null;
        } catch {
          return null;
        }
      })();

    return planFromStorage || Plan.NewAgent;
  }, []);

  const isNewAgent = resolvedPlan === Plan.NewAgent;
  const isAgent = resolvedPlan === Plan.Agent;

  const updateProspectInState = (updated: Prospect) => {
    setProspects((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleEditProspect = (row: Prospect) => {
    window.alert(`Edit is coming soon for ${row.full_name || row.email}.`);
  };

  const handleOpenCallLog = (row: Prospect) => {
    setActiveCallLogProspect(row);
  };

  const handleInviteProspect = (row: Prospect) => {
    if (!row.email) {
      window.alert('This prospect does not have an email address.');
      return;
    }

    const subject = encodeURIComponent('Invitation from Wealth Builders');
    const body = encodeURIComponent(`Hi ${row.full_name || ''},\n\nI would like to invite you to connect.`);
    window.location.href = `mailto:${row.email}?subject=${subject}&body=${body}`;
  };

  const handleSaveCallLog = async (outcome: string, note: string) => {
    if (!activeCallLogProspect) return;
    try {
      setSavingCallLog(true);
      const updated = await saveProspectCallLog(activeCallLogProspect, outcome, note);
      updateProspectInState(updated);
      setActiveCallLogProspect(updated);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to save call log.');
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleAddAgencyCode = async (row: Prospect) => {
    setAddAgencyCodeFor(row);
  };

  const handleSubmitAddAgencyCode = async (formData: AddAgentFormData) => {
    if (!addAgencyCodeFor) return;

    try {
      setSavingCallLog(true);
      const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();

      await updateProspectDetails(addAgencyCodeFor.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: fullName || undefined,
        phone: formData.phone,
        email: formData.email,
        ama_date: formData.amaDate,
        polo_size: formData.poloSize,
        spouse_name: formData.spouseName,
        spouse_phone: formData.spousePhone,
        spouse_polo_size: formData.spousePoloSize,
        recruited_by: formData.recruiterId,
        leader: formData.leaderId,
      });

      const updated = await activateProspectWithAgencyCode(addAgencyCodeFor.id, formData.agencyCode.trim());
      updateProspectInState(updated);
      setActiveCallLogProspect(updated);
      setAddAgencyCodeFor(null);
      window.alert('Agency code added successfully.');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to add agency code.');
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleQuickActionLog = async (row: Prospect, actionLabel: string) => {
    try {
      setSavingCallLog(true);
      const updated = await saveProspectCallLog(row, 'Connected', actionLabel);
      updateProspectInState(updated);
      setActiveCallLogProspect(updated);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : `Failed to ${actionLabel.toLowerCase()}.`);
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleDeleteProspect = (row: Prospect) => {
    const name = row.full_name || row.email || `#${row.id}`;
    const confirmed = window.confirm(`Remove ${name} from this list?`);
    if (!confirmed) return;

    setProspects((prev) => prev.filter((prospect) => prospect.id !== row.id));
  };

  const columns = useMemo(
    () => buildProspectColumns(handleEditProspect, handleOpenCallLog, handleDeleteProspect),
    []
  );

  useEffect(() => {
    const loadProspects = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProspects();
        setProspects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load prospects');
        console.error('Error loading prospects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProspects();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Prospect Tracker</h1>
          <p className="text-gray-400">Track and manage your prospects</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-gray-400">Loading prospects...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Prospect Tracker</h1>
          <p className="text-gray-400">Track and manage your prospects</p>
        </div>
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Prospects</h3>
          <p className="text-red-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Prospect Tracker</h1>
        <p className="text-gray-400">Track and manage your prospects • {prospects.length} total</p>
      </div>

      <TrackerTable
        columns={columns}
        rows={prospects}
        rowKey={(row) => String(row.id)}
        stickyFirstNColumns={3}
        resizable
        tableId="prospect-tracker"
        defaultSort={{ key: 'full_name', direction: 'asc' }}
        emptyMessage="No prospects found. Add your first prospect to get started!"
      />

      <CallLogModal
        prospect={activeCallLogProspect}
        saving={savingCallLog}
        hideRestrictedActions={isNewAgent}
        hideAddAgencyCode={isAgent}
        onClose={() => setActiveCallLogProspect(null)}
        onSave={handleSaveCallLog}
        onInvite={handleInviteProspect}
        onAddAgencyCode={handleAddAgencyCode}
        onRequestTrainer={(prospect) => handleQuickActionLog(prospect, 'Requested trainer')}
        onAddAppointment={(prospect) => handleQuickActionLog(prospect, 'Added appointment')}
        onAddProduction={(prospect) => handleQuickActionLog(prospect, 'Added production')}
      />

      <AddAgencyCodeModal
        prospect={addAgencyCodeFor}
        saving={savingCallLog}
        onClose={() => setAddAgencyCodeFor(null)}
        onSubmit={handleSubmitAddAgencyCode}
      />
    </div>
  );
}
