"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Bold, Italic, Link2, List, Heading2 } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  /** Initial content of the editor, as HTML. */
  value: string;
  /** Fired with the editor HTML whenever the content changes. */
  onChange?: (html: string) => void;
  /** Accessible name of the editing area. */
  ariaLabel?: string;
  className?: string;
}

/**
 * The Tiptap editor behind the notice body.
 *
 * Figma "Rich text notice editor" (2:12051 desktop, 2:12170 tablet,
 * 2:12282 mobile): a bordered panel with the toolbar on the first line —
 * "B  I  U  H2  • List  ↗ Link" — and the body below it.
 *
 * - Desktop and tablet (1440 / 768): the panel is 250px tall.
 * - Mobile (375): the body wraps onto more lines, so the panel is 319px tall.
 *
 * The editor is a UI only: the content never leaves the browser.
 *
 * This module is loaded on demand by `rich-text-editor.tsx`, so Tiptap and
 * ProseMirror stay out of the main bundle.
 */
export function RichTextEditor({
  value,
  onChange,
  ariaLabel = "Notice body",
  className,
}: RichTextEditorProps) {
  // The change handler is kept in a ref, so the editor is not rebuilt when the
  // parent passes a new function.
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2] } }),
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class:
          "min-h-[161px] w-full px-[25px] pb-6 pt-4 text-body leading-[1.45] text-ink outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChangeRef.current?.(instance.getHTML());
    },
  });

  // The notice body can change when another notice is opened, so the editor
  // follows the value it is given.
  React.useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;

    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  // The editor is built in an effect, so the panel is drawn empty for a frame.
  // It keeps the same heights as the loaded editor, so the page does not shift.
  if (!editor) {
    return (
      <div
        className={cn(
          "flex h-[319px] w-full flex-col items-start overflow-hidden rounded-[12px] border border-border bg-surface md:h-[250px]",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-[319px] w-full flex-col items-start overflow-hidden rounded-[12px] border border-border bg-surface md:h-[250px]",
        className,
      )}
    >
      <div className="flex w-full flex-wrap items-center gap-4 px-[25px] pt-[25px]">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold aria-hidden className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic aria-hidden className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span aria-hidden className="text-[13px] font-semibold leading-none">
            U
          </span>
        </ToolbarButton>

        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 aria-hidden className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List aria-hidden className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const current = editor.getAttributes("link").href as
              | string
              | undefined;
            const url = window.prompt("Link address", current ?? "https://");
            if (url === null) return;

            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }

            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run();
          }}
        >
          <Link2 aria-hidden className="size-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} className="w-full flex-1 overflow-y-auto" />
    </div>
  );
}

/** One toolbar button of the editor. */
function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  /** Accessible name of the button. */
  label: string;
  /** Whether the format is on. */
  active: boolean;
  /** Fired when the button is pressed. */
  onClick: () => void;
  /** The icon of the button. */
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-6 items-center justify-center rounded-[6px] text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-tint text-primary",
      )}
    >
      {children}
    </button>
  );
}
