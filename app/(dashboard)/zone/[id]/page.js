import PostView from "@/components/zone/PostView";

// In Next 16 `params` is a Promise.
export default async function PostPage({ params }) {
  const { id } = await params;
  return <PostView id={id} />;
}
