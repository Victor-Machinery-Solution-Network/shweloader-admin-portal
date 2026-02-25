"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Loader2,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseAndValidateExcel } from "@/lib/actions/bulk-upload";
import type {
  BulkUploadConfig,
  LookupData,
  ParsedRow,
} from "@/types/bulk-upload";

interface StepUploadValidateProps {
  config: BulkUploadConfig;
  parsedRows: ParsedRow[];
  onParsed: (rows: ParsedRow[], lookups: LookupData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepUploadValidate({
  config,
  parsedRows,
  onParsed,
  onNext,
  onBack,
}: StepUploadValidateProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validCount = parsedRows.filter((r) => r.status === "valid").length;
  const errorCount = parsedRows.filter((r) => r.status === "error").length;

  const handleFile = useCallback(
    async (file: File) => {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (
        !validTypes.includes(file.type) &&
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls")
      ) {
        setParseError("Please upload an Excel file (.xlsx or .xls)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setParseError("File too large (max 5MB)");
        return;
      }

      setIsParsing(true);
      setParseError(null);
      setFileName(file.name);

      const formData = new FormData();
      formData.append("file", file);

      const result = await parseAndValidateExcel(config.entityKey, formData);

      if (!result.success) {
        setParseError(result.error ?? "Failed to parse file");
        setIsParsing(false);
        return;
      }

      onParsed(result.rows!, result.lookups!);
      setIsParsing(false);
    },
    [config.entityKey, onParsed],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleReset() {
    onParsed([], {});
    setFileName(null);
    setParseError(null);
  }

  return (
    <div className="space-y-6">
      {/* Upload zone — show when no data parsed yet */}
      {parsedRows.length === 0 && (
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Upload Your File</CardTitle>
              <CardDescription>
                Upload the filled Excel template. We&apos;ll validate every row
                before importing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-16 transition-all",
                  isDragging
                    ? "scale-[1.01] border-primary bg-primary/5"
                    : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30",
                  isParsing && "pointer-events-none opacity-50",
                )}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {isParsing ? (
                  <>
                    <Loader2 className="size-10 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Validating {fileName}...
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Checking each row against validation rules
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted/50 transition-colors group-hover:border-primary/30 group-hover:bg-primary/5">
                      <FileSpreadsheet className="size-7 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Drop your Excel file here or{" "}
                        <span className="text-primary">browse</span>
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Supports .xlsx and .xls up to 5MB
                      </p>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleInputChange}
              />

              {parseError && (
                <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                  <AlertCircle className="size-4 shrink-0" />
                  {parseError}
                </div>
              )}

              <Button variant="outline" onClick={onBack} className="w-fit">
                <ArrowLeft className="size-4" />
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview table — after parsing */}
      {parsedRows.length > 0 && (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              <div className="bg-border mx-1 h-4 w-px" />
              <Badge variant="success">
                <CheckCircle2 className="size-3" />
                {validCount} valid
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="size-3" />
                  {errorCount} errors
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <X className="size-4" />
              Replace File
            </Button>
          </div>

          {/* Data table */}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-14 text-center">#</TableHead>
                  <TableHead className="w-20 text-center">Status</TableHead>
                  {config.columns.map((col) => (
                    <TableHead key={col.field}>{col.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row) => {
                  const errorMap = new Map(
                    row.errors.map((e) => [e.column, e.message]),
                  );
                  return (
                    <TableRow
                      key={row.rowIndex}
                      className={cn(
                        row.status === "error" &&
                          "bg-red-50/50 dark:bg-red-950/20",
                      )}
                    >
                      <TableCell className="text-muted-foreground text-center font-mono text-xs">
                        {row.rowIndex}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.status === "valid" ? (
                          <CheckCircle2 className="mx-auto size-4 text-green-600" />
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertCircle className="mx-auto size-4 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-xs"
                              >
                                <ul className="space-y-1 text-xs">
                                  {row.errors.map((e, i) => (
                                    <li key={i}>
                                      <strong>{e.column}:</strong> {e.message}
                                    </li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      {config.columns.map((col) => {
                        const errorMsg = errorMap.get(col.header);
                        const cellValue = String(row.data[col.field] ?? "");
                        return (
                          <TableCell
                            key={col.field}
                            className={cn(
                              "max-w-[200px] truncate text-sm",
                              errorMsg &&
                                "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
                            )}
                            title={errorMsg ?? cellValue}
                          >
                            {cellValue || (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button onClick={onNext} disabled={validCount === 0} size="lg">
              Continue with {validCount}{" "}
              {validCount === 1
                ? config.displayName.toLowerCase()
                : config.displayNamePlural.toLowerCase()}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
