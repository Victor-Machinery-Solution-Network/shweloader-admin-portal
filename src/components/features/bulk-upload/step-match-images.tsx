"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImageIcon,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageDropZone } from "./image-drop-zone";
import type {
  BulkUploadConfig,
  BulkUploadImageField,
  ParsedRow,
} from "@/types/bulk-upload";

interface StepMatchImagesProps {
  config: BulkUploadConfig;
  parsedRows: ParsedRow[];
  onRowsUpdated: (rows: ParsedRow[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepMatchImages({
  config,
  parsedRows,
  onRowsUpdated,
  onNext,
  onBack,
}: StepMatchImagesProps) {
  const imageFields = useMemo(() => config.imageFields ?? [], [config.imageFields]);
  const validRows = parsedRows.filter((r) => r.status === "valid");
  const batchInputRef = useRef<HTMLInputElement>(null);
  const [autoMatchResult, setAutoMatchResult] = useState<string | null>(null);

  const getRowLabel = useCallback(
    (row: ParsedRow): string => {
      const textCol = config.columns.find((c) => c.type === "text");
      if (textCol) {
        return (
          String(row.data[textCol.field] ?? "").trim() || `Row ${row.rowIndex}`
        );
      }
      return `Row ${row.rowIndex}`;
    },
    [config.columns],
  );

  const updateRowImages = useCallback(
    (rowIndex: number, fieldName: string, files: File[]) => {
      const updated = parsedRows.map((row) => {
        if (row.rowIndex !== rowIndex) return row;
        return {
          ...row,
          images: { ...row.images, [fieldName]: files },
        };
      });
      onRowsUpdated(updated);
    },
    [parsedRows, onRowsUpdated],
  );

  const handleBatchUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      e.target.value = "";

      let matched = 0;
      const updates = new Map<number, Record<string, File[]>>();

      for (const file of files) {
        const nameWithoutExt = file.name
          .replace(/\.[^.]+$/, "")
          .toLowerCase();

        for (const row of validRows) {
          const label = getRowLabel(row).toLowerCase();
          const rowNum = `row-${row.rowIndex}`;
          const rowNum2 = `row ${row.rowIndex}`;
          const rowNum3 = String(row.rowIndex);

          if (
            nameWithoutExt === label ||
            nameWithoutExt.startsWith(`${label}-`) ||
            nameWithoutExt.startsWith(`${label}_`) ||
            nameWithoutExt === rowNum ||
            nameWithoutExt === rowNum2 ||
            nameWithoutExt === rowNum3
          ) {
            const isPdf = file.type === "application/pdf";
            const isThumbnail =
              !isPdf &&
              (nameWithoutExt.endsWith("-thumbnail") ||
                nameWithoutExt.endsWith("_thumbnail"));

            if (!updates.has(row.rowIndex)) {
              updates.set(row.rowIndex, {});
            }
            const rowUpdates = updates.get(row.rowIndex)!;

            // Determine target field:
            // - PDFs → first pdf field
            // - Files ending with -thumb / _thumb → thumbnail (isPrimary) field
            // - Other images → product photos (non-primary) field
            let targetField: BulkUploadImageField | undefined;

            if (isPdf) {
              targetField = imageFields.find(
                (f) =>
                  f.r2Path.includes("pdf") &&
                  (rowUpdates[f.field]?.length ?? 0) < (f.maxPerRow ?? 1),
              );
            } else if (isThumbnail) {
              targetField = imageFields.find(
                (f) =>
                  f.isPrimary &&
                  !f.r2Path.includes("pdf") &&
                  (rowUpdates[f.field]?.length ?? 0) < (f.maxPerRow ?? 1),
              );
            } else {
              // Regular images → non-primary image fields first, then primary as fallback
              targetField = imageFields.find(
                (f) =>
                  !f.isPrimary &&
                  !f.r2Path.includes("pdf") &&
                  (rowUpdates[f.field]?.length ?? 0) < (f.maxPerRow ?? 1),
              ) ?? imageFields.find(
                (f) =>
                  !f.r2Path.includes("pdf") &&
                  (rowUpdates[f.field]?.length ?? 0) < (f.maxPerRow ?? 1),
              );
            }

            if (targetField) {
              if (!rowUpdates[targetField.field]) {
                rowUpdates[targetField.field] = [];
              }
              rowUpdates[targetField.field].push(file);
              matched++;
            }
            break;
          }
        }
      }

      if (updates.size > 0) {
        const updated = parsedRows.map((row) => {
          const rowUpdate = updates.get(row.rowIndex);
          if (!rowUpdate) return row;
          return {
            ...row,
            images: { ...row.images, ...rowUpdate },
          };
        });
        onRowsUpdated(updated);
      }

      setAutoMatchResult(
        `Matched ${matched} of ${files.length} files to ${updates.size} rows`,
      );
      setTimeout(() => setAutoMatchResult(null), 5000);
    },
    [validRows, imageFields, parsedRows, onRowsUpdated, getRowLabel],
  );

  const totalImages = validRows.reduce((acc, row) => {
    return (
      acc +
      Object.values(row.images).reduce(
        (sum, files) => sum + (files?.length ?? 0),
        0,
      )
    );
  }, 0);

  const rowsWithImages = validRows.filter((row) =>
    Object.values(row.images).some((files) => files && files.length > 0),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-5" />
              Match Files to Rows
            </CardTitle>
            <CardDescription>
              Assign images or PDFs to each row. You can drag files onto
              individual rows, or use batch auto-match.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Batch upload action */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                variant="outline"
                onClick={() => batchInputRef.current?.click()}
              >
                <Wand2 className="size-4" />
                Auto-Match by Filename
              </Button>
              <input
                ref={batchInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.gif,.webp,.pdf"
                className="hidden"
                onChange={handleBatchUpload}
              />
              <p className="text-muted-foreground text-xs">
                Name files to match:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">
                  brand-name.jpg
                </code>{" "}
                or{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">
                  row-1.jpg
                </code>
                . Add{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">
                  -thumbnail
                </code>{" "}
                suffix for thumbnails.
              </p>
            </div>

            {autoMatchResult && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400">
                <CheckCircle2 className="size-4 shrink-0" />
                {autoMatchResult}
              </div>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2.5">
              <Badge variant={totalImages > 0 ? "success" : "outline"}>
                <Upload className="size-3" />
                {totalImages} file{totalImages !== 1 ? "s" : ""}
              </Badge>
              <span className="text-muted-foreground text-xs">
                assigned to {rowsWithImages} of {validRows.length} rows
              </span>
              {totalImages > 0 && rowsWithImages === validRows.length && (
                <Badge variant="success" className="ml-auto">
                  <CheckCircle2 className="size-3" />
                  All rows covered
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-row image assignment */}
      <div className="mx-auto max-w-2xl space-y-2">
        {validRows.map((row) => (
          <RowImageCard
            key={row.rowIndex}
            row={row}
            label={getRowLabel(row)}
            imageFields={imageFields}
            onUpdateImages={updateRowImages}
          />
        ))}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={onNext} size="lg">
            Continue to Review
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Per-row card ────────────────────────────────────────────────────────────

interface RowImageCardProps {
  row: ParsedRow;
  label: string;
  imageFields: BulkUploadImageField[];
  onUpdateImages: (rowIndex: number, fieldName: string, files: File[]) => void;
}

function RowImageCard({
  row,
  label,
  imageFields,
  onUpdateImages,
}: RowImageCardProps) {
  const hasAnyImage = Object.values(row.images).some(
    (files) => files && files.length > 0,
  );

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        hasAnyImage
          ? "border-green-200 bg-green-50/30 dark:border-green-900/50 dark:bg-green-950/20"
          : "bg-muted/20"
      }`}
    >
      {/* Row header */}
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-6 items-center justify-center rounded-md bg-muted text-xs font-medium tabular-nums">
          {row.rowIndex}
        </span>
        <span className="truncate text-sm font-medium">{label}</span>
        {hasAnyImage && (
          <CheckCircle2 className="ml-auto size-4 shrink-0 text-green-600" />
        )}
      </div>

      {/* Image drop zones - stacked for better layout */}
      <div className="grid gap-2 sm:grid-cols-2">
        {imageFields.map((field) => (
          <ImageDropZone
            key={field.field}
            label={field.label}
            files={row.images[field.field] ?? []}
            onChange={(files) =>
              onUpdateImages(row.rowIndex, field.field, files)
            }
            acceptPdf={field.r2Path.includes("pdf")}
            maxFiles={field.maxPerRow ?? 1}
          />
        ))}
      </div>
    </div>
  );
}
