import type { FileVaultItem, FileVaultSection } from '../types';

type FileVaultContentProps = {
  activeSection: FileVaultSection;
  query: string;
  onQueryChange: (value: string) => void;
  filteredItems: FileVaultItem[];
  searchEnabled?: boolean;
};

export function FileVaultContent({
  activeSection,
  query,
  onQueryChange,
  filteredItems,
  searchEnabled = true,
}: FileVaultContentProps) {
  return (
    <main className="file-vault-content">
      <header className="file-vault-content__header">
        <div>
          <h2>{activeSection.label || 'File Vault'}</h2>
        </div>

        {searchEnabled && (
          <label className="file-vault-search">
            <span className="sr-only">Search in this section</span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search in this section"
            />
          </label>
        )}
      </header>

      <section className="file-vault-grid">
        {filteredItems.map((item) =>
          item.type === 'row' || item.item_view_type === 'row' || !item.thumb ? (
            <a
              key={item.id}
              className="file-vault-row"
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
            >
              <span className="file-vault-row__title">{item.title}</span>
              <span className="file-vault-row__arrow">›</span>
            </a>
          ) : (
            <a
              key={item.id}
              className="file-vault-card"
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
            >
              <div className="file-vault-card__thumb">
                <img src={item.thumb} alt={item.title} loading="lazy" />
              </div>
              <div className="file-vault-card__footer">
                <span className="file-vault-card__title">{item.title}</span>
              </div>
            </a>
          )
        )}

        {filteredItems.length === 0 && (
          <div className="file-vault-empty">
            {query.trim() ? (
              <>
                No results for <strong>{query}</strong>.
              </>
            ) : (
              'No documents in this section yet.'
            )}
          </div>
        )}
      </section>
    </main>
  );
}
