import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserDetailClient from "./UserDetailClient";

async function getUserById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, full_name, email, role, is_active, created_at")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

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
