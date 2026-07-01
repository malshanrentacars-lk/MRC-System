"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Activity, Eye } from "lucide-react";
import { createUser, updateUser, toggleUserActive } from "@/app/actions/users";
import PasswordConfirmModal from "@/components/shared/PasswordConfirmModal";
import StatusBadge from "@/components/shared/StatusBadge";
import ActivityLogTab from "./ActivityLogTab";
import { User } from "@/types";

export default function UsersClient({
  users: initialUsers,
  isAdmin,
}: {
  users: User[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);
  const [tab, setTab] = useState<"users" | "activity">(isAdmin ? "users" : "activity");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = editUser ? await updateUser(editUser.id, fd) : await createUser(fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      setShowForm(false); setEditUser(null);
      router.push('/users');
      router.refresh();
    });
  }

  async function handleToggle() {
    if (!confirmToggle) return;
    startTransition(async () => {
      await toggleUserActive(confirmToggle.id, !confirmToggle.is_active);
      setConfirmToggle(null);
      router.refresh();
    });
  }

  const tabs = [
    { key: "users" as const, label: "Users", icon: Users },
    { key: "activity" as const, label: "Activity Log", icon: Activity },
  ];

  return (
    <div className="section-card overflow-hidden">
      <div className="px-5 pt-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === key ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <button onClick={() => { setEditUser(null); setShowForm(true); }} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {tab === "users" && (
        <>
          {(showForm || editUser) && (
            <div className="border-b border-gray-100 p-5 bg-blue-50/30">
              <h3 className="text-sm font-semibold mb-4">{editUser ? "Edit User" : "New User"}</h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="form-label text-xs">Username <span className="text-red-500">*</span></label>
                  <input name="username" required defaultValue={editUser?.username ?? ""} className="form-input text-sm" disabled={!!editUser} />
                </div>
                <div>
                  <label className="form-label text-xs">Full Name <span className="text-red-500">*</span></label>
                  <input name="full_name" required defaultValue={editUser?.full_name ?? ""} className="form-input text-sm" />
                </div>
                <div>
                  <label className="form-label text-xs">Email</label>
                  <input name="email" type="email" defaultValue={editUser?.email ?? ""} className="form-input text-sm" />
                </div>
                <div>
                  <label className="form-label text-xs">Password {!editUser && <span className="text-red-500">*</span>} {editUser && <span className="text-gray-400">(leave blank to keep)</span>}</label>
                  <input name="password" type="password" required={!editUser} className="form-input text-sm" />
                </div>
                <div>
                  <label className="form-label text-xs">Role</label>
                  <select name="role" defaultValue={editUser?.role ?? "employee"} className="form-select text-sm">
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {error && <p className="col-span-3 text-sm text-red-600">{error}</p>}
                <div className="col-span-3 flex gap-3 justify-end">
                  <button type="button" onClick={() => { setShowForm(false); setEditUser(null); setError(null); }} className="btn-secondary text-sm">Cancel</button>
                  <button type="submit" disabled={isPending} className="btn-primary text-sm">{isPending ? "Saving..." : "Save User"}</button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="cursor-pointer transition-all duration-200 ease-out hover:bg-blue-50/80 hover:shadow-md hover:-translate-y-px hover:border-l-[3px] hover:border-l-blue-500 active:bg-blue-100 active:scale-[0.995] active:shadow-sm">
                    <td onClick={() => router.push(`/users/${u.id}`)}><code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">{u.username}</code></td>
                    <td onClick={() => router.push(`/users/${u.id}`)} className="font-medium">{u.full_name}</td>
                    <td onClick={() => router.push(`/users/${u.id}`)} className="text-gray-500">{u.email ?? "—"}</td>
                    <td onClick={() => router.push(`/users/${u.id}`)}><StatusBadge status={u.role} /></td>
                    <td onClick={() => router.push(`/users/${u.id}`)}><StatusBadge status={u.is_active ? "available" : "cancelled"} /></td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditUser(u); setShowForm(true); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmToggle(u); }}
                          className={`text-xs ${u.is_active ? "text-red-600" : "text-green-600"} hover:underline`}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/users/${u.id}`); }}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          <Eye className="w-3 h-3 inline mr-0.5" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PasswordConfirmModal
            open={!!confirmToggle}
            onOpenChange={() => setConfirmToggle(null)}
            title={confirmToggle?.is_active ? "Deactivate User" : "Activate User"}
            description={`Toggle active status for ${confirmToggle?.full_name}?`}
            onConfirm={handleToggle}
          />
        </>
      )}

      {tab === "activity" && (
        <ActivityLogTab
          isAdmin={isAdmin}
          users={users.map(u => ({ id: u.id, full_name: u.full_name, username: u.username }))}
        />
      )}
    </div>
  );
}
