import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { roleToPlan } from '@core/constants/roles';
import { Plan } from '@core/types';
import { FileVaultSidebar } from '../components/file-vault-sidebar';
import { FileVaultContent } from '../components/file-vault-content';
import { VAULT_DATA, filterVaultForPlan } from '../data/file-vault-data';
import './file-vault-page.css';

const normalizePlanFromRole = (role?: string | null): Plan => {
  const normalizedRole = (role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!normalizedRole) return Plan.NewAgent;
  return roleToPlan(normalizedRole);
};

const parseStoredRoles = (): string[] => {
  try {
    const rawRoles = localStorage.getItem('wb.roles');
    if (rawRoles) {
      const parsed = JSON.parse(rawRoles);
      if (Array.isArray(parsed)) {
        return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
      }
    }

    const storedUser = localStorage.getItem('authUser');
    if (!storedUser) return [];

    const parsedUser = JSON.parse(storedUser) as { roles?: unknown };
    if (!Array.isArray(parsedUser.roles)) return [];
    return parsedUser.roles.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  } catch {
    return [];
  }
};

export default function FileVaultPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('');

  const plan = useMemo(() => {
    const storedRole = user?.roles?.[0] || parseStoredRoles()[0] || null;
    return normalizePlanFromRole(storedRole);
  }, [user?.roles]);

  const vaultData = useMemo(() => filterVaultForPlan(VAULT_DATA, plan), [plan]);

  useEffect(() => {
    if (!vaultData.length) {
      setActiveId('');
      return;
    }

    if (!vaultData.some((section) => section.id === activeId)) {
      setActiveId(vaultData[0].id);
    }
  }, [vaultData, activeId]);

  const activeSection = useMemo(
    () => vaultData.find((section) => section.id === activeId) || vaultData[0] || { id: '', icon: '📁', label: '', items: [] },
    [vaultData, activeId]
  );

  const filteredItems = useMemo(() => {
    if (!query.trim()) return activeSection.items;
    const search = query.trim().toLowerCase();
    return activeSection.items.filter((item) => item.title.toLowerCase().includes(search));
  }, [activeSection, query]);

  const handleLeftKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!vaultData.length) return;

    const index = vaultData.findIndex((section) => section.id === activeId);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveId(vaultData[(index + 1) % vaultData.length].id);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveId(vaultData[(index - 1 + vaultData.length) % vaultData.length].id);
    }
  };

  return (
    <div className="file-vault-page">
      <div className="file-vault-shell">
        <FileVaultSidebar
          sections={vaultData}
          activeId={activeId}
          onSelect={setActiveId}
          onKeyDown={handleLeftKeyDown}
        />

        <FileVaultContent
          activeSection={activeSection}
          query={query}
          onQueryChange={setQuery}
          filteredItems={filteredItems}
        />
      </div>
    </div>
  );
}
