import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading, Text } from '@/shared/components';
import { useToastStore } from '@/store';
import type { ContentViewerTarget } from '@shared/services/content-page-service';
import CustomFlyerModal from './custom-flyer-modal';
import BusinessShowerFlyerModal from './business-shower-flyer-modal';
import FullscreenViewer, {
  isPdfUrl,
  isSlidesUrl,
  toEmbeddableSlidesUrl,
} from './fullscreen-viewer';
import { openSystematicToolResource } from '../services/systematic-tools-service';
import type { SystematicTool, SystematicToolItem } from '../types';
import './ten-tools.css';

const VIDEO_FILE = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

type SystematicToolsBrowserProps = {
  title: string;
  tools: SystematicTool[];
  /** Rendered on the right of the content header, e.g. a "Manage tools" link. */
  headerActions?: ReactNode;
  /** False for the admin "Preview as" view: cards render but do nothing. */
  interactive?: boolean;
  className?: string;
};

/**
 * The "10 Systematic Tools" look: tool list on the left, content cards on the
 * right. Data comes in already filtered by role; this only renders and opens.
 */
export function SystematicToolsBrowser({
  title,
  tools,
  headerActions,
  interactive = true,
  className,
}: SystematicToolsBrowserProps) {
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(() => tools[0]?.id ?? null);
  const [viewer, setViewer] = useState<ContentViewerTarget | null>(null);
  const [showNalFlyer, setShowNalFlyer] = useState(false);
  const [showBusinessShowerFlyer, setShowBusinessShowerFlyer] = useState(false);

  useEffect(() => {
    if (!tools.some((tool) => tool.id === activeId)) {
      setActiveId(tools[0]?.id ?? null);
    }
  }, [tools, activeId]);

  const activeTool = useMemo(
    () => tools.find((tool) => tool.id === activeId) ?? tools[0],
    [tools, activeId]
  );

  const showInViewer = (src: string, itemTitle: string) => {
    setViewer({ src, title: itemTitle || 'Viewer', allowDownload: false, forcePdf: false });
  };

  /** Must stay synchronous up to the open call so popup blockers allow new tabs. */
  const activate = (item: SystematicToolItem) => {
    switch (item.action) {
      case 'nal_flyer':
        setShowNalFlyer(true);
        return;
      case 'business_shower_flyer':
        setShowBusinessShowerFlyer(true);
        return;
      case 'coming_soon':
        return;
      default:
        break;
    }

    const href = item.href && item.href !== '#' ? item.href : '';

    if (href && isSlidesUrl(href)) {
      showInViewer(toEmbeddableSlidesUrl(href), item.title);
      return;
    }

    // PDFs and uploaded files go through the access/file endpoints, which
    // respect allow_download (view-only stream when downloads are off).
    if (item.is_pdf || item.resource_type === 'pdf' || !href) {
      void openSystematicToolResource(item).then((result) => {
        if ('viewer' in result) setViewer(result.viewer);
        else if ('failed' in result) {
          addToast({ type: 'error', message: 'Unable to open this resource.' });
        }
      });
      return;
    }

    // In-app routes navigate; Drive previews and direct video files render
    // in the in-app viewer; every other link is a web page, so a new tab.
    if (href.startsWith('/')) {
      navigate(href);
      return;
    }
    if (isPdfUrl(href) || VIDEO_FILE.test(href)) {
      showInViewer(href, item.title);
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const onLeftKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!tools.length) return;
    const index = tools.findIndex((tool) => tool.id === activeId);
    const safeIndex = index === -1 ? 0 : index;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveId(tools[(safeIndex + 1) % tools.length]?.id ?? null);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveId(tools[(safeIndex - 1 + tools.length) % tools.length]?.id ?? null);
    }
  };

  const renderItem = (item: SystematicToolItem) => {
    const comingSoon = item.action === 'coming_soon';
    const clickable = interactive && !comingSoon;
    const commonProps = {
      type: 'button' as const,
      title: comingSoon ? `${item.title} (coming soon)` : item.title,
      disabled: comingSoon,
      'aria-disabled': !clickable || undefined,
      onClick: clickable ? () => activate(item) : undefined,
    };
    const tag = comingSoon ? <span className="coming-soon-tag">Coming soon</span> : null;

    if (item.thumb) {
      return (
        <button
          key={item.id}
          {...commonProps}
          className={`vault-card as-button ${comingSoon ? 'is-disabled' : ''}`}
        >
          <div className="thumb-wrap">
            <img src={item.thumb} alt={item.title} loading="lazy" />
          </div>
          <div className="card-foot">
            <span className="name">{item.title}</span>
            {tag}
          </div>
        </button>
      );
    }

    return (
      <button key={item.id} {...commonProps} className={`vault-row as-button ${comingSoon ? 'is-disabled' : ''}`}>
        <span className="row-title">{item.title}</span>
        {tag ?? <span className="row-arrow">›</span>}
      </button>
    );
  };

  const renderContent = () => {
    if (!activeTool) {
      return (
        <div className="content-stage">
          <div className="stage-text">
            <Text variant="body">No tools are available for you yet.</Text>
          </div>
        </div>
      );
    }

    if (activeTool.items.length === 0) {
      return (
        <section className="vault-grid">
          <div className="empty">No content available yet for this tool.</div>
        </section>
      );
    }

    return (
      <div className="vault-content">
        <section className="vault-grid">{activeTool.items.map(renderItem)}</section>
      </div>
    );
  };

  return (
    <div className={`vault ${className ?? ''}`}>
      <aside className="vault-left" onKeyDown={onLeftKeyDown} tabIndex={0}>
        <div className="vault-left-head">
          <Heading as="h2" variant="h4">
            {title}
          </Heading>
        </div>

        <nav className="vault-menu">
          {tools.length === 0 ? (
            <div className="empty">No tools available.</div>
          ) : (
            tools.map((tool, index) => {
              const active = tool.id === activeTool?.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  className={`vault-menu-item ${active ? 'active' : ''}`}
                  onClick={() => setActiveId(tool.id)}
                  title={tool.label}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="icon" style={numberBadgeStyle}>
                    {index + 1}
                  </span>
                  <span className="text">{tool.label}</span>
                  <span className="chev">›</span>
                </button>
              );
            })
          )}
        </nav>
      </aside>

      <main className="vault-right">
        <header className="vault-right-head">
          <div className="title">
            <Heading as="h3" variant="h5">
              {activeTool?.label || title}
            </Heading>
          </div>
          {headerActions}
        </header>

        {renderContent()}
      </main>

      <FullscreenViewer
        isOpen={Boolean(viewer)}
        src={viewer?.src ?? ''}
        title={viewer?.title ?? ''}
        allowDownload={viewer?.allowDownload}
        httpHeaders={viewer?.httpHeaders}
        forcePdf={viewer?.forcePdf}
        onClose={() => setViewer(null)}
      />

      <CustomFlyerModal isOpen={showNalFlyer} onClose={() => setShowNalFlyer(false)} />

      <BusinessShowerFlyerModal
        isOpen={showBusinessShowerFlyer}
        onClose={() => setShowBusinessShowerFlyer(false)}
      />
    </div>
  );
}

const numberBadgeStyle: React.CSSProperties = {
  display: 'inline-grid',
  placeItems: 'center',
  width: 22,
  height: 22,
  borderRadius: 6,
  background: 'rgba(255,255,255,0.06)',
  fontWeight: 700,
  fontSize: '0.8rem',
};
