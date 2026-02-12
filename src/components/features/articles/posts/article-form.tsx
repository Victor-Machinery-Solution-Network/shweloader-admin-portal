"use client";

import { useState, useMemo, useTransition, useRef } from "react";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RequiredInput } from "@/components/ui/required-input";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { FormDialog } from "@/components/shared/form-dialog";
import { createArticle, updateArticle } from "@/lib/actions/article";
import type { Article, ArticleCategory } from "@/types/article";

/** Format current local datetime as YYYY-MM-DDTHH:mm for datetime-local input */
function getLocalNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

interface ArticleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: Article;
  categories: ArticleCategory[];
  onPublish?: () => void;
  isPublishing?: boolean;
}

export function ArticleForm({
  open,
  onOpenChange,
  article,
  categories,
  onPublish,
  isPublishing = false,
}: ArticleFormProps) {
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const isEditing = !!article;

  const categoryMap = new Map(categories.map((c) => [c.name, c.category_id]));
  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );

  const defaultCategoryName = article?.category_id
    ? (categories.find((c) => c.category_id === article.category_id)?.name ??
      "")
    : "";

  const [selectedCategory, setSelectedCategory] =
    useState<string>(defaultCategoryName);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedCategory(defaultCategoryName);
    }
    onOpenChange(nextOpen);
  };

  function handleSubmit(formData: FormData) {
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
        handleOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Edit Article" : "Create Article"}
      description={
        isEditing ? "Update the article details." : "Write a new article post."
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
      extraFooterAction={
        onPublish ? (
          <Button
            type="button"
            onClick={onPublish}
            disabled={isPending || isPublishing}
            className="gap-1.5"
          >
            <CheckCircle className="size-4" />
            Publish
          </Button>
        ) : undefined
      }
      className="sm:max-w-2xl"
    >
      <div ref={containerRef} className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Title</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="title"
              placeholder="e.g. How to Maintain Heavy Equipment"
              defaultValue={article?.title ?? ""}
              errorMessage="Title is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Content</FieldLabel>
          <FieldContent>
            <Textarea
              name="content"
              placeholder="Write your article content here…"
              defaultValue={article?.content ?? ""}
              className="min-h-40"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Category</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedCategory}
              onValueChange={(val) => setSelectedCategory(val ?? "")}
              items={categoryNames}
            >
              <ComboboxInput
                placeholder="Search category…"
                showClear={!!selectedCategory}
              />
              <ComboboxContent container={containerRef}>
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
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Publish Date</FieldLabel>
          <FieldContent>
            <Input
              name="publish_date"
              type="datetime-local"
              defaultValue={
                article?.publish_date
                  ? article.publish_date.slice(0, 16)
                  : getLocalNow()
              }
              autoComplete="off"
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
