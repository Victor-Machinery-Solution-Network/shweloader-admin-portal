"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { downloadTemplate } from "@/lib/actions/bulk-upload";
import type { BulkUploadConfig } from "@/types/bulk-upload";

interface StepDownloadTemplateProps {
  config: BulkUploadConfig;
  onNext: () => void;
}

export function StepDownloadTemplate({
  config,
  onNext,
}: StepDownloadTemplateProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const result = await downloadTemplate(config.entityKey);
      if (!result.success || !result.data) {
        alert(result.error ?? "Failed to download template");
        return;
      }

      const byteString = atob(result.data);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename ?? `${config.entityKey}-template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Download Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Fill in the Excel template, then upload it in the next step.
            Required fields are marked with <strong>*</strong>.
          </p>

          {/* Limit note — subtle inline */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            Up to {config.maxRows} rows per upload.
          </div>

          {/* Download CTA */}
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full"
            size="lg"
          >
            {isDownloading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating...
              </>
            ) : downloaded ? (
              <>
                <CheckCircle2 className="size-4" />
                Downloaded — Download Again
              </>
            ) : (
              <>
                <FileSpreadsheet className="size-4" />
                Download Template
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          variant={downloaded ? "default" : "outline"}
        >
          {downloaded ? "Continue to Upload" : "Skip — I have a template"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
