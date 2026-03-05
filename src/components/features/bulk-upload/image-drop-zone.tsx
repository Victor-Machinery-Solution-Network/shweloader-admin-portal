"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Image as ImageIcon, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const PDF_TYPES = new Set(["application/pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ImageDropZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  acceptPdf?: boolean;
  maxFiles?: number;
  label: string;
}

export function ImageDropZone({
  files,
  onChange,
  acceptPdf = false,
  maxFiles = 1,
  label,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = acceptPdf ? PDF_TYPES : IMAGE_TYPES;

  const acceptStr = acceptPdf
    ? ".pdf"
    : ".png,.jpg,.jpeg,.gif,.webp";

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.has(file.type)) {
        return acceptPdf
          ? "Only PDF files allowed"
          : "Only images allowed";
      }
      if (file.size > MAX_FILE_SIZE) {
        return "File too large (max 10MB)";
      }
      return null;
    },
    [acceptPdf, acceptedTypes],
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      setError(null);
      const validated: File[] = [];

      for (const file of newFiles) {
        const err = validateFile(file);
        if (err) {
          setError(err);
          return;
        }
        validated.push(file);
      }

      const combined = [...files, ...validated].slice(0, maxFiles);
      onChange(combined);
    },
    [files, maxFiles, onChange, validateFile],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (selected) addFiles(Array.from(selected));
    e.target.value = "";
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
    setError(null);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = Number(active.id);
      const newIndex = Number(over.id);
      onChange(arrayMove([...files], oldIndex, newIndex));
    },
    [files, onChange],
  );

  const isFull = files.length >= maxFiles;
  const sortable = maxFiles > 1 && files.length > 1;

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>

      {/* File list */}
      {files.length > 0 && sortable && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={files.map((_, idx) => idx)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {files.map((file, idx) => (
                <SortableFileItem
                  key={`${file.name}-${file.size}-${idx}`}
                  id={idx}
                  file={file}
                  onRemove={() => removeFile(idx)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {files.length > 0 && !sortable && (
        <div className="space-y-1">
          {files.map((file, idx) => (
            <FileItem
              key={`${file.name}-${idx}`}
              file={file}
              onRemove={() => removeFile(idx)}
            />
          ))}
        </div>
      )}

      {/* Drop zone */}
      {!isFull && (
        <div
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 transition-all",
            isDragging
              ? "scale-[1.02] border-primary bg-primary/5"
              : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30",
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="size-3.5 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            {acceptPdf ? "Drop PDF here" : "Drop image here"}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        multiple={maxFiles > 1}
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── File item (static) ──────────────────────────────────────────────────────

function FileItem({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs">
      {PDF_TYPES.has(file.type) ? (
        <FileText className="size-3.5 shrink-0 text-red-500" />
      ) : (
        <ImageIcon className="size-3.5 shrink-0 text-blue-500" />
      )}
      <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {(file.size / 1024).toFixed(0)}KB
      </span>
      <button
        type="button"
        className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

// ─── Sortable file item (drag reorder) ───────────────────────────────────────

function SortableFileItem({
  id,
  file,
  onRemove,
}: {
  id: number;
  file: File;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs",
        isDragging && "z-50 shadow-md ring-2 ring-primary/40 opacity-90",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      {PDF_TYPES.has(file.type) ? (
        <FileText className="size-3.5 shrink-0 text-red-500" />
      ) : (
        <ImageIcon className="size-3.5 shrink-0 text-blue-500" />
      )}
      <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {(file.size / 1024).toFixed(0)}KB
      </span>
      <button
        type="button"
        className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
