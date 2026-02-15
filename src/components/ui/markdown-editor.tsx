"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
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
}

export function MarkdownEditor({
  name,
  defaultValue = "",
  placeholder = "Start writing…",
  className,
  minHeight,
  disabled = false,
}: MarkdownEditorProps) {
  const [markdown, setMarkdown] = useState(defaultValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4 cursor-pointer",
        },
      }),
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    content: defaultValue,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMarkdown((editor.storage as any).markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: "outline-none",
      },
    },
  });

  return (
    <TooltipProvider>
      <div
        className={cn(
          "border-input bg-input/30 rounded-xl border overflow-hidden transition-colors",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 border-b border-input px-2 py-1 bg-muted/30">
          <ToolbarButton
            icon={Bold}
            label="Bold"
            isActive={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={disabled}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            isActive={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={disabled}
          />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <ToolbarButton
            icon={Heading2}
            label="Heading 2"
            isActive={editor?.isActive("heading", { level: 2 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            disabled={disabled}
          />
          <ToolbarButton
            icon={Heading3}
            label="Heading 3"
            isActive={editor?.isActive("heading", { level: 3 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            disabled={disabled}
          />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <ToolbarButton
            icon={List}
            label="Bullet List"
            isActive={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={disabled}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Ordered List"
            isActive={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
          />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <LinkPopover editor={editor} disabled={disabled} />
        </div>

        {/* Editor content */}
        <EditorContent
          editor={editor}
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none px-3 py-3",
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
}: {
  editor: Editor | null;
  disabled?: boolean;
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
              variant={editor?.isActive("link") ? "secondary" : "ghost"}
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
            {editor?.isActive("link") && (
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
