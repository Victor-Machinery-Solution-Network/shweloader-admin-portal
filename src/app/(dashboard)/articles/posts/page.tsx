import {
  articleCategoryService,
  articleStatusTypeService,
} from "@/lib/services/article";
import { getArticlesWithDetails } from "@/lib/actions/article";
import { PostsClient } from "@/components/features/articles/posts/posts-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Posts",
  description: "Manage article posts",
};

export default async function PostsPage() {
  const [articles, categories, statusTypes] = await Promise.all([
    getArticlesWithDetails(),
    articleCategoryService.list({ sort_by: "name", order: "asc" }),
    articleStatusTypeService.list(),
  ]);

  return (
    <PostsClient
      articles={articles}
      categories={categories}
      statusTypes={statusTypes}
    />
  );
}
