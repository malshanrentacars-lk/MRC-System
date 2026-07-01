import { getUsers } from "@/app/actions/users";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = session.role === "admin";
  const users = await getUsers();

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{isAdmin ? "Manage staff access, roles and permissions" : "View users and activity"}</p>
        </div>
      </div>
      <UsersClient users={users as any} isAdmin={isAdmin} />
    </div>
  );
}
