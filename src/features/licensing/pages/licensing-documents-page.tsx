import './licensing-documents-page.css';

/**
 * LicensingDocuments - Glass Card Design
 * - Grid of 3 documents with quick action buttons (View / Download).
 */

const DOCS = [
  {
    id: 'doc-grid',
    title: 'Licensing Grid',
    desc: 'Step-by-step milestones and ownership.',
    href: 'https://docs.google.com/spreadsheets/u/2/d/e/2PACX-1vTe3BGiOuar73naDMBnC2eFG4RwBQJtgP5YVBgp5-wLoElJOwN7wXIIG9gSe6fZ7Q/pubhtml?widget=true&headers=false',
  },
  {
    id: 'doc-unified',
    title: 'Unified Lic',
    desc: 'Unified licensing process & links.',
    href: 'https://docs.google.com/presentation/d/e/2PACX-1vQaPS7QmQSXsVS_I5uBvXUUyLafyncAvZZXGKJ3fnhpGx081EfjrzfF5ehOKDO6Kg/pubembed?start=false&loop=false&delayms=60000&slide=id.p1',
  },
  {
    id: 'doc-crash',
    title: 'Licensing Crash Course (PDF)',
    desc: 'Condensed notes to study faster.',
    href: 'https://files2.edgagement.com/sites/wb/media/en/resources/One_Day_LAH_Question_Review_Class_Instructor_File_1.1.pdf',
  },
];

export default function LicensingDocumentsPage() {
  return (
    <div className="lic-wrap lic-docs-page">
      <div className="lic-header">
        <h2 className="lic-docs-title">Documents</h2>
        <div className="lic-subtitle">
          Quick access to your licensing paperwork
        </div>
      </div>

      <div className="docs-grid-centered">
        {DOCS.map((d) => (
          <div key={d.id} className="doc-card-glass">
            <div className="doc-glow-effect"></div>
            <div className="doc-icon-glass">📄</div>
            <div className="doc-body">
              <div className="doc-title">{d.title}</div>
              <div className="doc-desc">{d.desc}</div>
              <div className="doc-actions">
                <a
                  className="btn gold"
                  href={d.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
