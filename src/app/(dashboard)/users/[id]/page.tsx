import { notFound } from "next/navigation";
import { getUserById } from "@/app/actions/users";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserDetailClient from "./UserDetailClient";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const p = await params;
  const user = await getUserById(p.id);
  if (!user) notFound();

  const isAdmin = session.role === "admin";
  const isOwnProfile = session.id === p.id;

  return (
    <UserDetailClient
      user={user}
      isAdmin={isAdmin}
      isOwnProfile={isOwnProfile}
    />
  );
}
