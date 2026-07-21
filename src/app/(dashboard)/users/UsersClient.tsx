"use client";

import { useState, useTransition, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Activity } from "lucide-react";
import { createUser, updateUser, getUsers } from "@/app/actions/users";
import StatusBadge from "@/components/shared/StatusBadge";
import ActivityLogTab from "./ActivityLogTab";
import { User } from "@/types";

const UserMobileCard = memo(function UserMobileCard({ user, onClick }: { user: User; onClick: () => void }) {
  return (
    <div onClick={onClick} className="section-card p-4 cursor-pointer active:scale-[0.98] transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-blue-700">{user.full_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.full_name}</p>
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{user.username}</code>
          </div>
        </div>
        <StatusBadge status={user.role} />
      </div>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{user.email ?? "—"}</span>
        <StatusBadge status={user.is_active ? "available" : "cancelled"} />
      </div>
    </div>
  );
});

export default function UsersClient({
  users: initialUsers,
  totalCount,
  isAdmin,
}: {
  users: User[];
  totalCount: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(totalCount > initialUsers.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"users" | "activity">(isAdmin ? "users" : "activity");

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    const next = page + 1;
    const { data } = await getUsers({ page: next, pageSize: 20 });
    if (data.length > 0) {
      setUsers(prev => [...prev, ...data]);
      setPage(next);
      setHasMore(data.length >= 20);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [page]);

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

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="data-table">
              <thead><tr><th></th><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} onClick={() => router.push(`/users/${u.id}`)} className="cursor-pointer transition-all duration-200 ease-out hover:bg-blue-50/80 hover:shadow-md hover:-translate-y-px hover:border-l-[3px] hover:border-l-blue-500 active:bg-blue-100 active:scale-[0.995] active:shadow-sm">
                    <td>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-blue-700">{u.full_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    </td>
                    <td><code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">{u.username}</code></td>
                    <td className="font-medium">{u.full_name}</td>
                    <td className="text-gray-500">{u.email ?? "—"}</td>
                    <td><StatusBadge status={u.role} /></td>
                    <td><StatusBadge status={u.is_active ? "available" : "cancelled"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {users.map(u => (
              <UserMobileCard key={u.id} user={u} onClick={() => router.push(`/users/${u.id}`)} />
            ))}
          </div>

          {hasMore && (
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <button onClick={handleLoadMore} disabled={loadingMore} className="btn-secondary text-sm">
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
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
