import { useEffect, type ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';
import { cn } from '@core/utils';
import { richTextClasses, toEditorHtml } from '../../utils/rich-text';

interface RichTextEditorProps {
  /** Current HTML (or legacy plain text, which is converted on load). */
  value: string;
  /** Receives HTML, or `''` when the document is empty. */
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum editing height, as a Tailwind class. */
  minHeightClass?: string;
}

/**
 * WYSIWYG editor for organizer copy (About, Notes, Refund policy).
 *
 * Offers only the formatting the backend allowlist keeps (headings, bold/
 * italic/underline/strike, lists, quotes, links, rules) — no images, colors or
 * code — so what the organizer sees here is exactly what the public page shows.
 * Sanitization itself happens server-side (`events/services/rich_text.py`).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClass = 'min-h-[120px]',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: cn('px-3 py-2 text-sm outline-none', minHeightClass, richTextClasses),
        ...(placeholder ? { 'aria-placeholder': placeholder } : {}),
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? '' : ed.getHTML()),
  });

  // Follow external resets (tab reload after save, discard) without fighting
  // the user's cursor while they type.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const next = toEditorHtml(value);
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (next !== current) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-900 focus-within:ring-2 focus-within:ring-ring dark:border-white/20 dark:bg-white/5 dark:text-white">
      {editor && <Toolbar editor={editor} />}
      <div className="relative">
        {editor?.isEmpty && placeholder ? (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-slate-500 dark:text-white/50">
            {placeholder}
          </span>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/** Formatting toolbar; re-renders only when the active marks/nodes change. */
function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      underline: ed.isActive('underline'),
      strike: ed.isActive('strike'),
      h2: ed.isActive('heading', { level: 2 }),
      h3: ed.isActive('heading', { level: 3 }),
      bullet: ed.isActive('bulletList'),
      ordered: ed.isActive('orderedList'),
      quote: ed.isActive('blockquote'),
      link: ed.isActive('link'),
      canUndo: ed.can().undo(),
      canRedo: ed.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  const editLink = () => {
    const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
    const url = window.prompt('Link URL (leave empty to remove)', previous);
    if (url === null) return;
    if (url.trim() === '') chain().extendMarkRange('link').unsetLink().run();
    else chain().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-white/10 dark:bg-white/5">
      <ToolButton
        label="Heading"
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Subheading"
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolButton>
      <Divider />
      <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Underline"
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolButton>
      <Divider />
      <ToolButton
        label="Bulleted list"
        active={state.bullet}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={state.ordered}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Quote"
        active={state.quote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Link" active={state.link} onClick={editLink}>
        <LinkIcon className="h-4 w-4" />
      </ToolButton>
      <Divider />
      <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor selection: a mousedown on the button would blur it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'rounded p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:text-white/70 dark:hover:bg-white/10',
        active && 'bg-slate-200 text-slate-900 dark:bg-white/15 dark:text-white',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-white/15" aria-hidden="true" />;
}
