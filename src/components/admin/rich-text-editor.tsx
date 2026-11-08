"use client";

import dynamic from "next/dynamic";

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
 * The rich text editor of the notice editor.
 *
 * Figma "Rich text notice editor" (2:12051 desktop, 2:12170 tablet,
 * 2:12282 mobile): a bordered panel with the toolbar on the first line —
 * "B  I  U  H2  • List  ↗ Link" — and the body below it.
 *
 * - Desktop and tablet (1440 / 768): the panel is 250px tall.
 * - Mobile (375): the body wraps onto more lines, so the panel is 319px tall.
 *
 * The editor itself is a UI only: the content never leaves the browser.
 *
 * Tiptap and ProseMirror are heavy, so the editor is loaded on demand: it
 * lands in its own chunk and the skeleton below holds the exact heights Figma
 * measures, so the page does not shift when the editor arrives.
 */
export function RichTextEditor(props: RichTextEditorProps) {
  return <TiptapEditor {...props} />;
}

const TiptapEditor = dynamic(
  () =>
    import("@/components/admin/rich-text-editor-tiptap").then(
      (module) => module.RichTextEditor,
    ),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  },
);

/**
 * The panel drawn while the editor chunk is on its way.
 *
 * It keeps the 250px desktop and 319px mobile heights of the editor, so the
 * page holds the rhythm Figma measures.
 */
function EditorSkeleton() {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-[319px] w-full flex-col items-start overflow-hidden rounded-[12px] border border-border bg-surface md:h-[250px]",
      )}
    />
  );
}
