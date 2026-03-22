"use client";

import { lazy, Suspense, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Pencil,
  CalendarIcon,
  SendHorizontal,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ImageInput } from "@/components/ui/image-input";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { FormSubmittedContext, RequiredInput } from "@/components/ui/required-input";
import { FormDialog } from "@/components/shared/form-dialog";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
const LazyCalendar = lazy(() =>
  import("@/components/ui/calendar").then((mod) => ({
    default: mod.Calendar,
  })),
);
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { useHasPermission } from "@/hooks/use-permissions";
import {
  createArticle,
  updateArticle,
  publishArticle,
  requestArticleRework,
  submitForReview,
  createAndSubmitForReview,
} from "@/lib/actions/article";
import type {
  ArticleWithDetails,
  ArticleCategory,
  ArticleStatusType,
} from "@/types/article";

function parseLocalDate(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr) return undefined;
  // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm" formats
  const [y, m, d] = dateStr.split(/[-T]/);
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function formatDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface ArticleEditorProps {
  article?: ArticleWithDetails;
  categories: ArticleCategory[];
  statusTypes: ArticleStatusType[];
}

export function ArticleEditor({
  article,
  categories,
  statusTypes,
}: ArticleEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const { data: session } = useSession();
  const currentUserName = session?.user?.name ?? "";
  const canApprove = useHasPermission("articles", "approve");

  // Submission action ref: set by button onClick before form onSubmit fires
  const submitActionRef = useRef<"draft" | "publish" | "save" | "submit-review" | "resubmit">("save");
  // Tracks whether a non-draft submission was attempted (for mandatory field indicators)
  const [strictValidation, setStrictValidation] = useState(false);

  // Article state detection
  const isNewArticle = !article;
  const isDraft = article?.status_name === "Draft";
  const isPublished =
    article?.status_name === "Published" || article?.status_name === "Hidden";
  const isPendingReview = article?.status_name === "Pending Review";
  const isRework = article?.status_name === "Rework";

  // Review mode: pending articles open read-only, "Edit" switches to editable
  const [isReviewMode, setIsReviewMode] = useState(isPendingReview);
  const [showRework, setShowRework] = useState(false);
  const fieldsDisabled = !!(isPendingReview && isReviewMode);

  // Status lookups
  const draftStatus = statusTypes.find((st) => st.status_name === "Draft");
  const publishedStatus = statusTypes.find(
    (st) => st.status_name === "Published",
  );

  const [publishDate, setPublishDate] = useState<Date | undefined>(
    parseLocalDate(article?.publish_date) ?? new Date(),
  );
  const [coverImage, setCoverImage] = useState<string | null>(
    article?.cover_image_url ?? null,
  );
  const [coverFocalPoint, setCoverFocalPoint] = useState<{ x: number; y: number } | null>(
    article?.focal_x != null && article?.focal_y != null
      ? { x: article.focal_x, y: article.focal_y }
      : null,
  );
  const [contentValue, setContentValue] = useState(article?.content ?? "");

  const categoryNames = categories.map((c) => c.name);

  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    article?.category_id
      ? (categories.find((c) => c.category_id === article.category_id)?.name ??
          "")
      : "",
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (fieldsDisabled) return; // Prevent submit in review mode
    setSubmitted(true);
    if (!e.currentTarget.checkValidity()) return;

    const action = submitActionRef.current;
    const formData = new FormData(e.currentTarget);

    // Mandatory fields for non-draft actions
    if (action !== "draft") {
      setStrictValidation(true);
      const missing: string[] = [];
      if (!selectedCategory) missing.push("Category");
      if (!coverImage) missing.push("Cover Image");
      if (!contentValue.trim()) missing.push("Content");
      if (missing.length > 0) {
        toast.error(`Required: ${missing.join(", ")}`);
        return;
      }
    }

    if (coverFocalPoint) {
      formData.set("cover_focal_x", String(coverFocalPoint.x));
      formData.set("cover_focal_y", String(coverFocalPoint.y));
    }

    const categoryMap = new Map(categories.map((c) => [c.name, c.category_id]));
    const categoryId = categoryMap.get(selectedCategory);
    if (categoryId) {
      formData.set("category_id", categoryId.toString());
    }

    // Set status based on which button was clicked
    if (action === "draft" && draftStatus) {
      formData.set("article_status_type_id", draftStatus.id.toString());
    } else if (action === "publish" && publishedStatus) {
      formData.set("article_status_type_id", publishedStatus.id.toString());
    } else if (action === "save" && article?.article_status_type_id) {
      // Preserve existing status for published/hidden/pending article edits
      formData.set(
        "article_status_type_id",
        article.article_status_type_id.toString(),
      );
    }

    startTransition(async () => {
      let result: { success: boolean; error?: string };

      if (action === "submit-review" && isNewArticle) {
        // New article → create directly with "Pending Review" status
        result = await createAndSubmitForReview(formData);
      } else if (action === "submit-review" && article) {
        // Existing draft → save then submit for review
        result = await updateArticle(article.article_id, formData);
        if (result.success) {
          result = await submitForReview(article.article_id);
        }
      } else if (action === "resubmit" && article) {
        // Rejected article → save edits then resubmit for review
        result = await updateArticle(article.article_id, formData);
        if (result.success) {
          result = await submitForReview(article.article_id);
        }
      } else {
        result = article
          ? await updateArticle(article.article_id, formData)
          : await createArticle(formData);
      }

      if (result.success) {
        const message =
          action === "draft"
            ? "Draft saved"
            : action === "publish"
              ? "Article published"
              : action === "submit-review" || action === "resubmit"
                ? "Submitted for review"
                : "Article updated";
        toast.success(message);
        const tab =
          action === "publish"
            ? "published"
            : action === "submit-review" || action === "resubmit"
              ? "pending"
              : action === "draft"
                ? "drafts"
                : "published";
        router.push(`/articles/posts?tab=${tab}`);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  // Approve + publish a Pending Review article (status change only, no content save)
  function handleApprovePublish() {
    if (!article) return;
    startTransition(async () => {
      const result = await publishArticle(article.article_id);
      if (result.success) {
        toast.success("Article published");
        router.push("/articles/posts?tab=published");
      } else {
        toast.error(result.error ?? "Failed to publish");
      }
    });
  }

  // Request rework on a Pending Review article with optional reason
  function handleRequestRework(formData: FormData) {
    if (!article) return;
    const reason = formData.get("rework_reason") as string;
    startTransition(async () => {
      const result = await requestArticleRework(article.article_id, reason);
      if (result.success) {
        toast.success("Article sent for rework");
        setShowRework(false);
        router.push("/articles/posts");
      } else {
        toast.error(result.error ?? "Failed to request rework");
      }
    });
  }

  // Heading text
  const headingText = isNewArticle
    ? "Create Article"
    : isPendingReview && isReviewMode
      ? "Review Article"
      : "Edit Article";

  const subtitleText = isNewArticle
    ? "Write a new article post."
    : isDraft
      ? "Continue editing your draft."
      : isRework
        ? "This article was returned for rework. Edit and resubmit."
        : isPendingReview && isReviewMode
          ? "Review and approve or request rework on this article."
          : isPendingReview
            ? "Edit the article before approving."
            : "Update the article details.";

  return (
    <>
      <form
        noValidate
        onSubmit={handleSubmit}
        className="-m-6 flex min-h-0 flex-1 flex-col"
      >
        <FormSubmittedContext value={submitted}>
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="border-b px-6 py-4">
            <Link
              href="/articles/posts"
              className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to Posts
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {headingText}
                  </h1>
                  {article?.status_name && (
                    <Badge
                      variant={
                        isDraft
                          ? "secondary"
                          : isPublished
                            ? "default"
                            : isRework
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {article.status_name}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">{subtitleText}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Discard / Back — always shown */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    if (isNewArticle) {
                      // Hard navigation to fully reset form state
                      window.location.href = "/articles/posts";
                      return;
                    }
                    router.push("/articles/posts");
                  }}
                >
                  {fieldsDisabled ? "Back" : "Discard"}
                </Button>

                {/* New article or Draft — with approve: Save Draft + Publish */}
                {(isNewArticle || isDraft) && canApprove && (
                  <>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        submitActionRef.current = "draft";
                      }}
                    >
                      {isPending && submitActionRef.current === "draft" ? (
                        <>
                          <Spinner className="mr-1" /> Saving{"\u2026"}
                        </>
                      ) : (
                        "Save Draft"
                      )}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        submitActionRef.current = "publish";
                      }}
                    >
                      {isPending && submitActionRef.current === "publish" ? (
                        <>
                          <Spinner className="mr-1" /> Publishing{"\u2026"}
                        </>
                      ) : (
                        "Publish"
                      )}
                    </Button>
                  </>
                )}

                {/* New article or Draft — without approve: Save Draft + Submit for Review */}
                {(isNewArticle || isDraft) && !canApprove && (
                  <>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        submitActionRef.current = "draft";
                      }}
                    >
                      {isPending && submitActionRef.current === "draft" ? (
                        <>
                          <Spinner className="mr-1" /> Saving{"\u2026"}
                        </>
                      ) : (
                        "Save Draft"
                      )}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        submitActionRef.current = "submit-review";
                      }}
                      className="gap-1.5"
                    >
                      {isPending && submitActionRef.current === "submit-review" ? (
                        <>
                          <Spinner className="mr-1" /> Submitting{"\u2026"}
                        </>
                      ) : (
                        <>
                          <SendHorizontal className="size-4" />
                          Submit for Review
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Rework article: Save Draft + Resubmit */}
                {isRework && (
                  <>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        submitActionRef.current = "draft";
                      }}
                    >
                      {isPending && submitActionRef.current === "draft" ? (
                        <>
                          <Spinner className="mr-1" /> Saving{"\u2026"}
                        </>
                      ) : (
                        "Save Draft"
                      )}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        submitActionRef.current = "resubmit";
                      }}
                      className="gap-1.5"
                    >
                      {isPending && submitActionRef.current === "resubmit" ? (
                        <>
                          <Spinner className="mr-1" /> Resubmitting{"\u2026"}
                        </>
                      ) : (
                        <>
                          <SendHorizontal className="size-4" />
                          Resubmit
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Published/Hidden article: just Save */}
                {isPublished && (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      submitActionRef.current = "save";
                    }}
                  >
                    {isPending ? (
                      <>
                        <Spinner className="mr-1" /> Saving{"\u2026"}
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                )}

                {/* Pending Review — Review Mode: Approve + Reject + Edit */}
                {isPendingReview && isReviewMode && canApprove && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => setShowRework(true)}
                      className="gap-1.5"
                    >
                      <XCircle className="size-4" />
                      Request Rework
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => setIsReviewMode(false)}
                      className="gap-1.5"
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={handleApprovePublish}
                      className="gap-1.5"
                    >
                      <CheckCircle className="size-4" />
                      Approve
                    </Button>
                  </>
                )}

                {/* Pending Review — Edit Mode: Save + Approve */}
                {isPendingReview && !isReviewMode && canApprove && (
                  <>
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => {
                        submitActionRef.current = "save";
                      }}
                    >
                      {isPending && submitActionRef.current === "save" ? (
                        <>
                          <Spinner className="mr-1" /> Saving{"\u2026"}
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={handleApprovePublish}
                      className="gap-1.5"
                    >
                      <CheckCircle className="size-4" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Main content ───────────────────────────────────────── */}
          <div className="flex min-h-0 flex-1">
            {/* Left column — editor */}
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pt-4 pb-6">
              {/* Rework reason banner */}
              {isRework && article?.rejection_reason && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800">Returned for Rework</p>
                    <p className="text-sm text-muted-foreground">{article.rejection_reason}</p>
                  </div>
                </div>
              )}
              <Field>
                <FieldLabel>Title <span className="text-destructive">*</span></FieldLabel>
                <RequiredInput
                  name="title"
                  disabled={fieldsDisabled}
                  placeholder="e.g. How to Maintain Heavy Equipment"
                  defaultValue={article?.title ?? ""}
                  errorMessage="Title is required"
                  autoComplete="off"
                  className="text-lg"
                />
              </Field>
              <Field className="min-h-0 flex-1">
                <FieldLabel>Content <span className="text-destructive">*</span></FieldLabel>
                <MarkdownEditor
                  name="content"
                  disabled={fieldsDisabled}
                  placeholder="Write your article content here…"
                  defaultValue={article?.content ?? ""}
                  onChange={setContentValue}
                  className={cn(
                    "min-h-0 flex-1",
                    strictValidation && !contentValue.trim() && "border-destructive",
                  )}
                />
              </Field>
            </div>

            {/* Right column — metadata sidebar */}
            <div className="w-80 shrink-0 overflow-y-auto border-l bg-muted/30 px-6 py-4">
              <h3 className="text-muted-foreground mb-4 text-xs font-semibold tracking-widest uppercase">
                Details
              </h3>

              <div className="space-y-5">
                <Field>
                  <FieldLabel>Category <span className="text-destructive">*</span></FieldLabel>
                  <Combobox
                    value={selectedCategory}
                    onValueChange={(val) => setSelectedCategory(val ?? "")}
                    items={categoryNames}
                  >
                    <ComboboxInput
                      disabled={fieldsDisabled}
                      placeholder="Search category…"
                      showClear={!fieldsDisabled && !!selectedCategory}
                      aria-invalid={strictValidation && !selectedCategory ? true : undefined}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxEmpty>No category found</ComboboxEmpty>
                        <ComboboxCollection>
                          {(name) => (
                            <ComboboxItem key={name} value={name}>
                              {name}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </Field>

                <Field>
                  <FieldLabel>Publish Date</FieldLabel>
                  <input
                    type="hidden"
                    name="publish_date"
                    value={publishDate ? formatDateValue(publishDate) : ""}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={fieldsDisabled}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !publishDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {publishDate
                          ? publishDate.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Suspense
                        fallback={
                          <div className="flex items-center justify-center p-8">
                            <Spinner className="size-5" />
                          </div>
                        }
                      >
                        <LazyCalendar
                          mode="single"
                          selected={publishDate}
                          onSelect={setPublishDate}
                          defaultMonth={publishDate}
                        />
                      </Suspense>
                    </PopoverContent>
                  </Popover>
                </Field>

                <Field>
                  <FieldLabel>Author</FieldLabel>
                  <Input
                    name="author_name"
                    disabled={fieldsDisabled}
                    placeholder="e.g. John Doe"
                    defaultValue={article?.author_name ?? currentUserName}
                    autoComplete="off"
                  />
                </Field>

                <Separator />

                <Field>
                  <FieldLabel>Cover Image <span className="text-destructive">*</span></FieldLabel>
                  <ImageInput
                    name="cover_image_url"
                    disabled={fieldsDisabled}
                    value={coverImage}
                    onChange={setCoverImage}
                    placeholder="Upload cover image"
                    maxSizeMB={50}
                    aspectRatio={16 / 9}
                    focalPoint={coverFocalPoint ?? undefined}
                    onFocalPointChange={setCoverFocalPoint}
                  />
                  {strictValidation && !coverImage && (
                    <p className="text-destructive text-xs">Cover image is required</p>
                  )}
                </Field>
              </div>
            </div>
          </div>
        </FormSubmittedContext>
      </form>

      {/* ── Rework Dialog ─────────────────────────────────────────── */}
      <FormDialog
        open={showRework}
        onOpenChange={setShowRework}
        title="Request Rework"
        description={`Return "${article?.title ?? "this article"}" for rework.`}
        onSubmit={handleRequestRework}
        isPending={isPending}
        submitLabel="Request Rework"
      >
        <div className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>Reason (optional)</FieldLabel>
            <FieldContent>
              <Input
                name="rework_reason"
                placeholder="e.g. Content needs more detail"
              />
            </FieldContent>
          </Field>
        </div>
      </FormDialog>
    </>
  );
}
