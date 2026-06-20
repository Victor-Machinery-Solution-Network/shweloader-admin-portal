"use client";

import { useState } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MarkdownEditorProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  onChange?: (markdown: string) => void;
}

export function MarkdownEditor({
  name,
  defaultValue = "",
  placeholder = "Start writing…",
  className,
  minHeight,
  disabled = false,
  onChange,
}: MarkdownEditorProps) {
  const [markdown, setMarkdown] = useState(defaultValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        strike: {},
        blockquote: {},
        horizontalRule: {},
        codeBlock: false,
        code: false,
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-4 cursor-pointer",
          },
        },
      }),
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    content: defaultValue,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown() as string;
      setMarkdown(md);
      onChange?.(md);
    },
    editorProps: {
      attributes: {
        class: "outline-none",
      },
      handlePaste: (view, event) => {
        // Paste as plain text (ignore source HTML formatting), but preserve
        // line structure: each line becomes its own paragraph. A single
        // insertText() of multi-line text collapses every line into one block,
        // so a pasted list can't be turned into real <ol>/<ul> items. Splitting
        // into paragraphs lets the user select them and apply a numbered list
        // (one item per line) — and pasting INTO a list yields one item per line.
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;

        const normalized = text.replace(/\r\n?/g, "\n");
        // Single-line paste: let the default handler run (keeps inline cursor
        // behavior, e.g. pasting a word mid-sentence).
        if (!normalized.includes("\n")) return false;

        const { schema, doc, selection, tr } = view.state;
        const paragraphs = normalized
          .split("\n")
          .map((line) =>
            schema.nodes.paragraph.create(
              null,
              line.length ? schema.text(line) : undefined,
            ),
          );
        // Build the Slice via runtime constructors — `@tiptap/pm/model` isn't a
        // hoisted dependency under pnpm, so the Fragment/Slice classes can't be
        // imported directly. doc.content is a Fragment; selection.content() is a
        // Slice — grab their constructors.
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const FragmentCtor = (doc.content as any).constructor;
        const SliceCtor = (selection.content() as any).constructor;
        // openStart/openEnd = 1 so the first/last paragraphs merge with the
        // block at the cursor instead of forcing hard boundaries (this is how a
        // pasted multi-line block becomes one list item per line inside a list).
        const slice = new SliceCtor(FragmentCtor.fromArray(paragraphs), 1, 1);
        /* eslint-enable @typescript-eslint/no-explicit-any */
        view.dispatch(tr.replaceSelection(slice).scrollIntoView());
        return true;
      },
    },
  });

  const defaultState = {
    bold: false, italic: false, underline: false, strike: false,
    h2: false, h3: false, bulletList: false, orderedList: false,
    blockquote: false, link: false, canUndo: false, canRedo: false,
  };

  // Reactive state — re-renders toolbar when active marks/nodes change
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return defaultState;
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        blockquote: e.isActive("blockquote"),
        link: e.isActive("link"),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  }) ?? defaultState;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "border-input bg-input/30 flex flex-col rounded-xl border overflow-hidden transition-colors",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-input px-2 py-1 bg-muted/30">
          <ToolbarButton
            icon={Bold}
            label="Bold"
            isActive={active.bold}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={disabled}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            isActive={active.italic}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={disabled}
          />
          <ToolbarButton
            icon={UnderlineIcon}
            label="Underline"
            isActive={active.underline}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            disabled={disabled}
          />
          <ToolbarButton
            icon={Strikethrough}
            label="Strikethrough"
            isActive={active.strike}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            disabled={disabled}
          />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <ToolbarButton
            icon={Heading2}
            label="Heading 2"
            isActive={active.h2}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            disabled={disabled}
          />
          <ToolbarButton
            icon={Heading3}
            label="Heading 3"
            isActive={active.h3}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            disabled={disabled}
          />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <ToolbarButton
            icon={List}
            label="Bullet List"
            isActive={active.bulletList}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={disabled}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Ordered List"
            isActive={active.orderedList}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
          />
          <ToolbarButton
            icon={Quote}
            label="Blockquote"
            isActive={active.blockquote}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={disabled}
          />
          <ToolbarButton
            icon={Minus}
            label="Horizontal Rule"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            disabled={disabled}
          />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <LinkPopover editor={editor} disabled={disabled} isActive={active.link} />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <ToolbarButton
            icon={Undo2}
            label="Undo"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={disabled || !active.canUndo}
          />
          <ToolbarButton
            icon={Redo2}
            label="Redo"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={disabled || !active.canRedo}
          />
        </div>

        {/* Editor content */}
        <EditorContent
          editor={editor}
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none min-h-0 flex-1 overflow-y-auto pt-0 pb-3 px-3",
            "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-16",
            minHeight && `[&_.ProseMirror]:${minHeight}`,
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
          )}
        />

        {/* Hidden input for FormData */}
        <input type="hidden" name={name} value={markdown} />
      </div>
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Toolbar button                                                     */
/* ------------------------------------------------------------------ */

function ToolbarButton({
  onClick,
  isActive = false,
  icon: Icon,
  label,
  disabled,
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "secondary" : "ghost"}
          size="icon-xs"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={isActive}
        >
          <Icon className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/*  Link popover                                                       */
/* ------------------------------------------------------------------ */

function LinkPopover({
  editor,
  disabled,
  isActive = false,
}: {
  editor: Editor | null;
  disabled?: boolean;
  isActive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && editor) {
      const existingHref = editor.getAttributes("link").href;
      setUrl(existingHref ?? "");
    }
    setOpen(nextOpen);
  }

  function applyLink() {
    if (!editor) return;
    if (url.trim()) {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setOpen(false);
    setUrl("");
  }

  function removeLink() {
    editor?.chain().focus().unsetLink().run();
    setOpen(false);
    setUrl("");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={isActive ? "secondary" : "ghost"}
              size="icon-xs"
              disabled={disabled}
              aria-label="Link"
            >
              <LinkIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Link</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            autoComplete="off"
          />
          <div className="flex justify-end gap-1.5">
            {isActive && (
              <Button
                type="button"
                variant="destructive"
                size="xs"
                onClick={removeLink}
              >
                Remove
              </Button>
            )}
            <Button type="button" size="xs" onClick={applyLink}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
