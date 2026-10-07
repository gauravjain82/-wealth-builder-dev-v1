/**
 * Hidden-name act text. The server replaces the name with `_____`; this renders each
 * blank as a styled chip that a screen reader announces as "name hidden" rather than
 * five underscores. Nothing here knows or reconstructs who the blank stands for.
 */

const BLANK = '_____';

interface ActTextProps {
  text: string;
  className?: string;
}

export function ActText({ text, className }: ActTextProps) {
  const parts = text.split(BLANK);
  return (
    <p className={['wb-coh-act__text', className ?? ''].join(' ').trim()}>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 && (
            <span className="wb-coh-blank" role="img" aria-label="name hidden">
              <span aria-hidden="true">&nbsp;</span>
            </span>
          )}
        </span>
      ))}
    </p>
  );
}
