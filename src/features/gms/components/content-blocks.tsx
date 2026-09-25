/**
 * Renders a revision's structured content.
 *
 * Blocks are a closed set and none of them carries HTML, so nothing here calls
 * `dangerouslySetInnerHTML`. That is the whole reason the backend stores validated
 * blocks rather than Markdown: with no HTML in the data, there is no sanitiser to
 * configure correctly and no XSS surface to get wrong.
 *
 * `metric_note` is the interesting one. It renders text the **server** resolved from
 * the host service that owns it (decision G6), so the Help says exactly what the tier
 * editor says about `BR`, `BP` and `LIC` — not a copy that drifts the next time
 * somebody edits one of them. When the reference cannot be resolved it says so, rather
 * than rendering an empty box that looks like a design mistake.
 */

import type { ContentBlock } from '../types';

interface ContentBlocksProps {
  blocks: ContentBlock[];
}

function MetricNote({ block }: { block: Extract<ContentBlock, { type: 'metric_note' }> }) {
  if (block.unavailable || !block.resolved) {
    return (
      <div className="wb-gms-metric wb-gms-metric--unavailable">
        <span className="wb-gms-metric__label">{block.key}</span>
        <p>
          This explanation is not available in the current version of the app. Check the
          field's own label on the screen.
        </p>
      </div>
    );
  }
  return (
    <div className="wb-gms-metric">
      <span className="wb-gms-metric__label">{block.resolved.key}</span>{' '}
      <span>{block.resolved.label}</span>
      {block.resolved.note ? <p>{block.resolved.note}</p> : null}
      {block.resolved.calculation ? (
        <p>
          <em>{block.resolved.calculation}</em>
        </p>
      ) : null}
    </div>
  );
}

/** Render one validated block. */
function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return block.level === 3 ? <h3>{block.text}</h3> : <h2>{block.text}</h2>;
    case 'paragraph':
      return <p>{block.text}</p>;
    case 'list':
      return block.ordered ? (
        <ol>
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul>
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    case 'note':
      return <div className={`wb-gms-note wb-gms-note--${block.tone}`}>{block.text}</div>;
    case 'link':
      // Site-relative links stay in the app; absolute ones open safely.
      return block.href.startsWith('/') ? (
        <p>
          <a href={block.href}>{block.text}</a>
        </p>
      ) : (
        <p>
          <a href={block.href} target="_blank" rel="noreferrer noopener">
            {block.text}
          </a>
        </p>
      );
    case 'metric_note':
      return <MetricNote block={block} />;
    default:
      // An unknown block type means the server is newer than this build. Render
      // nothing rather than guessing — the same rule the walkthrough follows for an
      // unregistered target.
      return null;
  }
}

/** Render a whole revision's content. */
export function ContentBlocks({ blocks }: ContentBlocksProps) {
  return (
    <div className="wb-gms-content">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
