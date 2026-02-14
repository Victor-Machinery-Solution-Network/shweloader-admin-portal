import {
  getCachedArticlesWithDetails,
  getCachedArticleCategories,
  getCachedArticleStatusTypes,
} from "@/lib/cache";
import { PostsClient } from "@/components/features/articles/posts/posts-client";

export const metadata = {
  title: "Posts",
  description: "Manage article posts",
};

export default async function PostsPage() {
  const [articles, categories, statusTypes] = await Promise.all([
    getCachedArticlesWithDetails(),
    getCachedArticleCategories(),
    getCachedArticleStatusTypes(),
  ]);

  return (
    <PostsClient
      articles={articles}
      categories={categories}
      statusTypes={statusTypes}
    />
  );
}
