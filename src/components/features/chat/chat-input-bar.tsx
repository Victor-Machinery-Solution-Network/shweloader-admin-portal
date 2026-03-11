"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Paperclip, Send, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputBarProps {
  onSend: (message: string, files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf";
const MAX_FILES = 5;

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInputBar({ onSend, disabled = false }: ChatInputBarProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Map<string, string>>(
    new Map(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const newFiles = [...files, ...selected].slice(0, MAX_FILES);
    setFiles(newFiles);

    // Generate previews for image files
    selected.forEach((file) => {
      if (isImageFile(file)) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setFilePreviews((prev) => {
            const next = new Map(prev);
            next.set(file.name + file.size, ev.target?.result as string);
            return next;
          });
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    const file = files[index];
    if (file) {
      const key = file.name + file.size;
      setFilePreviews((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSend() {
    const trimmed = message.trim();
    if (!trimmed && files.length === 0) return;
    if (disabled) return;

    onSend(trimmed, files);
    setMessage("");
    setFiles([]);
    setFilePreviews(new Map());

    // Refocus textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = (message.trim().length > 0 || files.length > 0) && !disabled;

  return (
    <div className="border-t border-border bg-background">
      {/* Attachment preview bar */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {files.map((file, index) => {
            const key = file.name + file.size;
            const preview = filePreviews.get(key);
            return (
              <div
                key={key}
                className="relative flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2 py-1.5 pr-7 text-sm"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt={file.name}
                    className="size-8 rounded object-cover"
                  />
                ) : (
                  <FileText className="size-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 max-w-[120px]">
                  <p className="truncate text-xs font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute right-1 top-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="size-3 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-3">
        {/* Attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || files.length >= MAX_FILES}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 mb-0.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= MAX_FILES}
          title={
            files.length >= MAX_FILES
              ? `Maximum ${MAX_FILES} files`
              : "Attach files"
          }
        >
          <Paperclip className="size-4" />
          <span className="sr-only">Attach files</span>
        </Button>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          className={cn(
            "flex-1 min-h-[40px] max-h-[160px] resize-none rounded-2xl border-border bg-input/30 py-2 text-sm",
          )}
          rows={1}
        />

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          className="shrink-0 mb-0.5"
          onClick={handleSend}
          disabled={!canSend}
          title="Send message"
        >
          <Send className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </div>
  );
}
