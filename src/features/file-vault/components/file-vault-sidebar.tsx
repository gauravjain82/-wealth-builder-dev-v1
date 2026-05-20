import type { KeyboardEvent } from 'react';

type FileVaultSidebarProps = {
  sections: Array<{
    id: string;
    icon: string;
    label: string;
  }>;
  activeId: string;
  onSelect: (sectionId: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

export function FileVaultSidebar({ sections, activeId, onSelect, onKeyDown }: FileVaultSidebarProps) {
  return (
    <aside className="file-vault-sidebar" onKeyDown={onKeyDown} tabIndex={0}>
      <div className="file-vault-sidebar__header">
        <h1>File Vault</h1>
      </div>

      <nav className="file-vault-menu" aria-label="File vault sections">
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              className={`file-vault-menu-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(section.id)}
              title={section.label}
            >
              <span className="file-vault-menu-item__icon">{section.icon}</span>
              <span className="file-vault-menu-item__label">{section.label}</span>
              <span className="file-vault-menu-item__chevron">›</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
