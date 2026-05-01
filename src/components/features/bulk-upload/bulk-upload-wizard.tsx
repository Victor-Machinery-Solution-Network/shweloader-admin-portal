"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Download,
  Upload,
  ImageIcon,
  Import,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StepDownloadTemplate } from "./step-download-template";
import { StepUploadValidate } from "./step-upload-validate";
import { StepMatchImages } from "./step-match-images";
import { StepReviewImport } from "./step-review-import";
import type {
  BulkUploadConfig,
  ParsedRow,
  ImportResult,
} from "@/types/bulk-upload";

type Step = "download" | "upload" | "images" | "review";

const STEP_META: Record<Step, { label: string; icon: typeof Download }> = {
  download: { label: "Template", icon: Download },
  upload: { label: "Upload", icon: Upload },
  images: { label: "Images", icon: ImageIcon },
  review: { label: "Import", icon: Import },
};

interface BulkUploadWizardProps {
  config: BulkUploadConfig;
}

export function BulkUploadWizard({ config }: BulkUploadWizardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const hasImages = (config.imageFields?.length ?? 0) > 0;

  const steps = useMemo<Step[]>(
    () =>
      hasImages
        ? ["download", "upload", "images", "review"]
        : ["download", "upload", "review"],
    [hasImages],
  );

  const currentStep = (searchParams.get("step") ?? "download") as Step;
  const stepIndex = steps.indexOf(currentStep);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    // If users land on deeper steps without parsed data, route back to upload safely.
    if (parsedRows.length > 0 || importResult) return;
    if (currentStep !== "images" && currentStep !== "review") return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "upload");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [currentStep, importResult, parsedRows.length, router, searchParams]);

  const clearWizardState = useCallback(() => {
    setParsedRows([]);
    setImportResult(null);
    setResetKey((k) => k + 1);
  }, []);

  const resetWizard = useCallback(() => {
    clearWizardState();
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "upload");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [clearWizardState, searchParams, router]);

  const goToStep = useCallback(
    (step: Step) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", step);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const afterUpload = hasImages ? "images" : "review";

  return (
    <div className="-m-6 flex min-h-0 flex-1 flex-col">
      {/* ── Sticky Header ─────────────────────────────────────── */}
      <header className="bg-background sticky top-0 z-10 border-b px-6 py-3 backdrop-blur-sm">
        <nav className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
          {config.entityKey === "listings" ? (
            <span>{config.displayNamePlural}</span>
          ) : (
            <Link
              href={config.returnRoute}
              className="hover:text-foreground transition-colors"
            >
              {config.displayNamePlural}
            </Link>
          )}
          <ChevronRight className="size-3 opacity-40" />
          <span className="text-foreground font-medium">Import</span>
        </nav>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Excel Import
          </h1>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(config.returnRoute)}
          >
            Discard
          </Button>
        </div>

        {/* ── Step Indicator ──────────────────────────────────── */}
        <nav aria-label="Wizard steps" className="mx-auto mt-3 max-w-sm">
          <ol className="flex items-center">
            {steps.map((step, idx) => {
              const meta = STEP_META[step];
              const Icon = meta.icon;
              const isCompleted = idx < stepIndex;
              const isCurrent = idx === stepIndex;

              return (
                <li
                  key={step}
                  className={cn(
                    "flex items-center",
                    idx < steps.length - 1 && "flex-1",
                  )}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                        isCompleted &&
                          "border-primary bg-primary text-primary-foreground",
                        isCurrent &&
                          "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                        !isCompleted &&
                          !isCurrent &&
                          "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
                      )}
                    >
                      {isCompleted ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : (
                        <Icon className="size-3.5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium transition-colors",
                        isCurrent
                          ? "text-primary"
                          : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {idx < steps.length - 1 && (
                    <div className="mx-3 mb-5 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className={cn(
                          "h-full rounded-full bg-primary transition-all duration-500",
                          isCompleted ? "w-full" : "w-0",
                        )}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      {/* ── Step Content ──────────────────────────────────────── */}
      <div className="space-y-8 px-6 pt-10 pb-6">
        {currentStep === "download" && (
          <StepDownloadTemplate
            config={config}
            onNext={() => goToStep("upload")}
          />
        )}
        {currentStep === "upload" && (
          <StepUploadValidate
            key={resetKey}
            config={config}
            parsedRows={parsedRows}
            onParsed={(rows) => {
              setParsedRows(rows);
              // A new parse starts a new import session.
              setImportResult(null);
            }}
            onNext={() => goToStep(afterUpload)}
            onBack={() => goToStep("download")}
          />
        )}
        {currentStep === "images" && hasImages && (
          <StepMatchImages
            config={config}
            parsedRows={parsedRows}
            onRowsUpdated={setParsedRows}
            onNext={() => goToStep("review")}
            onBack={() => goToStep("upload")}
          />
        )}
        {currentStep === "review" && (
          <StepReviewImport
            config={config}
            parsedRows={parsedRows}
            importResult={importResult}
            onImported={(result) => {
              setImportResult(result);
              setParsedRows([]);
            }}
            onBack={() => {
              setImportResult(null);
              goToStep("upload");
            }}
            onReset={resetWizard}
          />
        )}
      </div>
    </div>
  );
}
