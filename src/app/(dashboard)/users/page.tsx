import { getUsers } from "@/app/actions/users";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";
import ActivityLogTab from "./ActivityLogTab";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = session.role === "admin";
  if (!isAdmin) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Activity</h1>
            <p className="page-subtitle">View your recent actions in the system</p>
          </div>
        </div>
        <ActivityLogTab isAdmin={isAdmin} users={[]} />
      </div>
    );
  }

  const users = await getUsers();

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage staff access, roles and permissions</p>
        </div>
      </div>
      <UsersClient users={users as any} isAdmin={isAdmin} />
    </div>
  );
}
