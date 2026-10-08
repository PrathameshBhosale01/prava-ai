import EditPost from "@/components/zone/EditPost";

export const metadata = { title: "Edit story" };

export default async function EditPostPage({ params }) {
  const { id } = await params;
  return <EditPost id={id} />;
}
