"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Paperclip, Send, X, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatFileSize } from "@/lib/utils";
import { assetUrl } from "@/lib/r2-url";
import { useSendTypingEvent } from "@/hooks/use-chat";
import { ProductPicker } from "./product-picker";

interface SelectedListing {
  id: number;
  type: "sale" | "rent";
  name: string | null;
  thumbnail: string | null;
  brandName: string | null;
  price: number | null;
  displayCurrency: string | null;
}

interface ChatInputBarProps {
  onSend: (message: string, files: File[], listing?: { id: number; type: "sale" | "rent" }) => void;
  disabled?: boolean;
  sessionId: number | null;
}

const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf";
const MAX_FILES = 5;

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function ChatInputBar({ onSend, disabled = false, sessionId }: ChatInputBarProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Map<string, string>>(
    new Map(),
  );
  const [selectedProduct, setSelectedProduct] = useState<SelectedListing | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendTyping } = useSendTypingEvent(sessionId);

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
    if (!trimmed && files.length === 0 && !selectedProduct) return;
    if (disabled) return;

    onSend(
      trimmed,
      files,
      selectedProduct ? { id: selectedProduct.id, type: selectedProduct.type } : undefined,
    );
    setMessage("");
    setFiles([]);
    setFilePreviews(new Map());
    setSelectedProduct(null);

    // Refocus textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(e.target.value);
    sendTyping();
  }

  const canSend =
    (message.trim().length > 0 || files.length > 0 || selectedProduct != null) && !disabled;

  const hasFiles = files.length > 0;
  const hasProduct = selectedProduct != null;

  return (
    <div className="border-t border-border bg-background">
      {/* Product preview */}
      {selectedProduct && (
        <div className="flex items-center gap-2 px-3 pt-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2 py-1.5 pr-7 text-sm relative">
            <div className="size-8 rounded overflow-hidden bg-muted shrink-0">
              {selectedProduct.thumbnail ? (
                <img
                  src={assetUrl(selectedProduct.thumbnail) ?? undefined}
                  alt={selectedProduct.name ?? "Product"}
                  className="object-cover size-full"
                />
              ) : (
                <div className="size-full bg-muted" />
              )}
            </div>
            <div className="min-w-0 max-w-[200px]">
              {selectedProduct.brandName && (
                <p className="text-[10px] uppercase text-muted-foreground truncate">
                  {selectedProduct.brandName}
                </p>
              )}
              <p className="truncate text-xs font-medium">{selectedProduct.name ?? "Unnamed"}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="absolute right-1 top-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              aria-label="Remove product"
            >
              <X className="size-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

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
          disabled={disabled || files.length >= MAX_FILES || hasProduct}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 mb-0.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= MAX_FILES || hasProduct}
          title={
            hasProduct
              ? "Remove product to attach files"
              : files.length >= MAX_FILES
                ? `Maximum ${MAX_FILES} files`
                : "Attach files"
          }
        >
          <Paperclip className="size-4" />
          <span className="sr-only">Attach files</span>
        </Button>

        {/* Product share button */}
        <div className="relative shrink-0 mb-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowProductPicker(!showProductPicker)}
            disabled={disabled || hasFiles}
            title={
              hasFiles
                ? "Remove files to share a product"
                : "Share a product"
            }
          >
            <Package className="size-4" />
            <span className="sr-only">Share product</span>
          </Button>
          {showProductPicker && (
            <div className="absolute bottom-full left-0 mb-2 z-50">
              <ProductPicker
                onSelect={(listing) => {
                  setSelectedProduct(listing);
                  setShowProductPicker(false);
                }}
                onCancel={() => setShowProductPicker(false)}
              />
            </div>
          )}
        </div>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextChange}
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
