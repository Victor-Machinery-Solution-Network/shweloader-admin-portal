"use client";

import { lazy, Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ImageInput } from "@/components/ui/image-input";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { FormSubmittedContext } from "@/components/ui/required-input";
import { Field, FieldLabel } from "@/components/ui/field";
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
import {
  createArticle,
  updateArticle,
  updateArticleStatus,
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
  statusTypes?: ArticleStatusType[];
}

export function ArticleEditor({
  article,
  categories,
  statusTypes,
}: ArticleEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const isEditing = !!article;
  const { data: session } = useSession();
  const currentUserName = session?.user?.name ?? "";

  const isPendingArticle =
    article && (!article.status_name || article.status_name === "Pending");
  const publishedStatus = statusTypes?.find(
    (st) => st.status_name === "Published",
  );

  const [publishDate, setPublishDate] = useState<Date | undefined>(
    parseLocalDate(article?.publish_date) ?? new Date(),
  );
  const [coverImage, setCoverImage] = useState<string | null>(
    article?.cover_image_url ?? null,
  );

  const categoryNames = categories.map((c) => c.name);

  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    article?.category_id
      ? (categories.find((c) => c.category_id === article.category_id)?.name ??
          "")
      : "",
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (!e.currentTarget.checkValidity()) return;

    const formData = new FormData(e.currentTarget);
    const categoryMap = new Map(categories.map((c) => [c.name, c.category_id]));
    const categoryId = categoryMap.get(selectedCategory);
    if (categoryId) {
      formData.set("category_id", categoryId.toString());
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateArticle(article.article_id, formData)
        : await createArticle(formData);

      if (result.success) {
        toast.success(isEditing ? "Article updated" : "Article created");
        router.push("/articles/posts");
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  function handlePublish() {
    if (!article || !publishedStatus) return;
    startTransition(async () => {
      const result = await updateArticleStatus(
        article.article_id,
        publishedStatus.id,
      );
      if (result.success) {
        toast.success("Article published");
        router.push("/articles/posts");
      } else {
        toast.error(result.error ?? "Failed to publish");
      }
    });
  }

  return (
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
              <h1 className="text-3xl font-bold tracking-tight">
                {isEditing ? "Edit Article" : "Create Article"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditing
                  ? "Update the article details."
                  : "Write a new article post."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => router.push("/articles/posts")}
              >
                Discard
              </Button>

              {isPendingArticle && publishedStatus && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={handlePublish}
                  className="gap-1.5"
                >
                  <CheckCircle className="size-4" />
                  Publish
                </Button>
              )}

              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner className="mr-1" /> Saving{"\u2026"}
                  </>
                ) : isEditing ? (
                  "Save"
                ) : (
                  "Publish"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Main content ───────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1">
          {/* Left column — editor */}
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pt-4 pb-6">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input
                name="title"
                required
                placeholder="e.g. How to Maintain Heavy Equipment"
                defaultValue={article?.title ?? ""}
                autoComplete="off"
                aria-invalid={
                  submitted && !article?.title ? true : undefined
                }
                className="text-lg"
              />
            </Field>
            <Field className="min-h-0 flex-1">
              <FieldLabel>Content</FieldLabel>
              <MarkdownEditor
                name="content"
                placeholder="Write your article content here…"
                defaultValue={article?.content ?? ""}
                className="min-h-0 flex-1"
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
                <FieldLabel>Category</FieldLabel>
                <Combobox
                  value={selectedCategory}
                  onValueChange={(val) => setSelectedCategory(val ?? "")}
                  items={categoryNames}
                >
                  <ComboboxInput
                    placeholder="Search category…"
                    showClear={!!selectedCategory}
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
                  placeholder="e.g. John Doe"
                  defaultValue={article?.author_name ?? currentUserName}
                  autoComplete="off"
                />
              </Field>

              <Separator />

              <Field>
                <FieldLabel>Cover Image</FieldLabel>
                <ImageInput
                  name="cover_image_url"
                  value={coverImage}
                  onChange={setCoverImage}
                  placeholder="Upload cover image"
                  maxSizeMB={5}
                />
              </Field>
            </div>
          </div>
        </div>
      </FormSubmittedContext>
    </form>
  );
}
