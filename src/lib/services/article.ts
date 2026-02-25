import { createService } from "@/lib/api/create-service";
import type {
  ArticleCategory,
  Article,
  ArticleStatusType,
} from "@/types/article";

export const articleCategoryService = createService<ArticleCategory, "category_id">(
  "article_category",
  { primaryKey: "category_id" },
);

export const articleService = createService<Article, "article_id">("article", {
  primaryKey: "article_id",
});

export const articleStatusTypeService = createService<ArticleStatusType>(
  "article_status_type",
);
