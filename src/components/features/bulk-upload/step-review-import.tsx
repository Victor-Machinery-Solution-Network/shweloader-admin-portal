"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  processBulkImport,
  processBulkImportWithImages,
} from "@/lib/actions/bulk-upload";
import type {
  BulkUploadConfig,
  ImportResult,
  ParsedRow,
} from "@/types/bulk-upload";

interface StepReviewImportProps {
  config: BulkUploadConfig;
  parsedRows: ParsedRow[];
  lookups: Record<string, { label: string; value: string | number }[]>;
  importResult: ImportResult | null;
  onImported: (result: ImportResult) => void;
  onBack: () => void;
}

export function StepReviewImport({
  config,
  parsedRows,
  importResult,
  onImported,
  onBack,
}: StepReviewImportProps) {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);

  const validRows = parsedRows.filter((r) => r.status === "valid");
  const errorRows = parsedRows.filter((r) => r.status === "error");

  const hasImages = parsedRows.some((r) =>
    Object.values(r.images).some((files) => files && files.length > 0),
  );

  async function handleImport() {
    setIsImporting(true);
    try {
      let result;

      if (hasImages) {
        const formData = new FormData();
        const rowsForJson = parsedRows.map((r) => ({
          ...r,
          images: {},
        }));
        formData.append("rows", JSON.stringify(rowsForJson));

        for (const row of parsedRows) {
          for (const [fieldName, files] of Object.entries(row.images)) {
            if (!files) continue;
            for (let i = 0; i < files.length; i++) {
              formData.append(
                `image_${row.rowIndex}_${fieldName}_${i}`,
                files[i],
              );
            }
          }
        }

        result = await processBulkImportWithImages(
          config.entityKey,
          formData,
        );
      } else {
        result = await processBulkImport(config.entityKey, parsedRows);
      }

      onImported(result);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Import failed unexpectedly",
      );
    } finally {
      setIsImporting(false);
    }
  }

  // ── Import complete view ──────────────────────────────────────────────
  if (importResult) {
    const allSuccess =
      importResult.failed === 0 && importResult.skipped === 0;
    const successRate = Math.round(
      (importResult.succeeded / importResult.total) * 100,
    );

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div
              className={cn(
                "mx-auto mb-3 flex size-14 items-center justify-center rounded-full",
                allSuccess
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-amber-100 dark:bg-amber-900/30",
              )}
            >
              {allSuccess ? (
                <CheckCircle2 className="size-7 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="size-7 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <CardTitle className="text-center text-lg">
              {allSuccess ? "Import Successful!" : "Import Complete"}
            </CardTitle>
            <CardDescription className="text-center">
              {importResult.succeeded} of {importResult.total}{" "}
              {config.displayNamePlural.toLowerCase()} imported successfully
              {allSuccess ? "." : ` (${successRate}%)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                <span className="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">
                  {importResult.succeeded}
                </span>
                <span className="text-muted-foreground text-xs">Created</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                <span className="text-2xl font-bold tabular-nums text-red-700 dark:text-red-400">
                  {importResult.failed}
                </span>
                <span className="text-muted-foreground text-xs">Failed</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border p-3">
                <span className="text-muted-foreground text-2xl font-bold tabular-nums">
                  {importResult.skipped}
                </span>
                <span className="text-muted-foreground text-xs">Skipped</span>
              </div>
            </div>

            {/* Per-row results */}
            {importResult.rows.length > 0 && (
              <div className="max-h-60 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-14 text-center">#</TableHead>
                      <TableHead className="w-24 text-center">
                        Status
                      </TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.rows.map((r) => (
                      <TableRow key={r.rowIndex}>
                        <TableCell className="text-center font-mono text-xs">
                          {r.rowIndex}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.status === "success" && (
                            <Badge variant="success" className="text-xs">
                              Created
                            </Badge>
                          )}
                          {r.status === "error" && (
                            <Badge variant="destructive" className="text-xs">
                              Failed
                            </Badge>
                          )}
                          {r.status === "skipped" && (
                            <Badge variant="outline" className="text-xs">
                              Skipped
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate text-xs">
                          {r.error ?? "Created successfully"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                size="lg"
                onClick={() => router.push(config.returnRoute)}
              >
                Go to {config.displayNamePlural}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Importing state ─────────────────────────────────────────────────
  if (isImporting) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="size-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-base font-medium">
                Importing {validRows.length}{" "}
                {validRows.length === 1
                  ? config.displayName.toLowerCase()
                  : config.displayNamePlural.toLowerCase()}
                ...
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {hasImages
                  ? "Uploading files and creating records"
                  : "Creating records in the database"}
              </p>
            </div>
            {/* Animated progress bar */}
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-full origin-left animate-pulse rounded-full bg-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Pre-import review view ────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ready to Import</CardTitle>
          <CardDescription>
            Review the summary below. Valid rows will be created as{" "}
            {config.displayNamePlural.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Summary stats */}
          <div className="flex items-center gap-3">
            <Badge variant="success">
              <CheckCircle2 className="size-3" />
              {validRows.length}{" "}
              {validRows.length === 1
                ? config.displayName.toLowerCase()
                : config.displayNamePlural.toLowerCase()}{" "}
              to import
            </Badge>
            {errorRows.length > 0 && (
              <Badge variant="destructive">
                <XCircle className="size-3" />
                {errorRows.length} skipped
              </Badge>
            )}
          </div>

          {/* Preview of valid rows */}
          {validRows.length > 0 && (
            <div className="max-h-48 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-14 text-center">#</TableHead>
                    {config.columns.map((col) => (
                      <TableHead key={col.field}>{col.header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validRows.slice(0, 10).map((row) => (
                    <TableRow key={row.rowIndex}>
                      <TableCell className="text-center font-mono text-xs">
                        {row.rowIndex}
                      </TableCell>
                      {config.columns.map((col) => (
                        <TableCell
                          key={col.field}
                          className="max-w-[150px] truncate text-sm"
                        >
                          {String(row.data[col.field] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {validRows.length > 10 && (
                    <TableRow>
                      <TableCell
                        colSpan={config.columns.length + 1}
                        className="text-muted-foreground text-center text-xs"
                      >
                        +{validRows.length - 10} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Import CTA */}
          <Button
            onClick={handleImport}
            disabled={validRows.length === 0}
            className="w-full"
            size="lg"
          >
            Import {validRows.length}{" "}
            {validRows.length === 1
              ? config.displayName
              : config.displayNamePlural}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
