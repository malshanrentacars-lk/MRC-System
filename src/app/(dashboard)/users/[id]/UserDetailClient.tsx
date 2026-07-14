"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, User, Edit, Activity, Shield, Mail, Calendar,
  AlertCircle, RefreshCw, ChevronDown, Trash2, Check, ShieldCheck
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
import { updateUser, toggleUserActive } from "@/app/actions/users";
import { getActivityLogs } from "@/app/actions/activity";
import { useRouter } from "next/navigation";
import { getTOTPStatus, adminResetTOTP } from "@/app/actions/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type LogEntry = {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  entity_id: string | null;
  entity_label: string | null;
  details: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700",
  updated: "bg-blue-100 text-blue-700",
  deleted: "bg-red-100 text-red-700",
  activated: "bg-emerald-100 text-emerald-700",
  deactivated: "bg-orange-100 text-orange-700",
  returned: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-600",
  status_changed: "bg-yellow-100 text-yellow-700",
  exchanged: "bg-indigo-100 text-indigo-700",
  login: "bg-gray-100 text-gray-600",
};

const MODULE_ICONS: Record<string, string> = {
  Vehicles: "🚗", Customers: "👤", Suppliers: "🏢",
  Guarantors: "🛡️", Rentals: "📋", Users: "👥", Settings: "⚙️",
};

const MODULES = ["all", "Vehicles", "Customers", "Suppliers", "Guarantors", "Rentals", "Users", "Settings"];
const PAGE_SIZE = 15;

function formatTime(isoStr: string) {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Activity Log Sub-component ───────────────────────────────────────────────
function UserActivityLog({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState("all");

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      setError(null);
      try {
        const currentPage = reset ? 1 : page;
        const result = await getActivityLogs({
          userId,
          module: moduleFilter !== "all" ? moduleFilter : undefined,
          page: currentPage,
          pageSize: PAGE_SIZE,
        });
        if (reset) {
          setLogs(result.data as LogEntry[]);
          setPage(1);
        } else {
          setLogs((prev) => [...prev, ...(result.data as LogEntry[])]);
        }
        setTotal(result.count);
      } catch (e: any) {
        setError(e.message ?? "Failed to load logs");
      } finally {
        setLoading(false);
      }
    },
    [userId, page, moduleFilter]
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, moduleFilter]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);
    try {
      const result = await getActivityLogs({
        userId,
        module: moduleFilter !== "all" ? moduleFilter : undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setLogs((prev) => [...prev, ...(result.data as LogEntry[])]);
      setTotal(result.count);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-gray-400">{total} events</span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="form-select text-xs h-8 pr-7 pl-2 appearance-none"
            >
              <option value="all">All Modules</option>
              {MODULES.filter((m) => m !== "all").map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
          </div>
          <button onClick={() => load(true)} className="btn-secondary text-xs h-8 px-3" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-5 py-4 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />{error}
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {logs.length === 0 && !loading ? (
          <div className="flex flex-col items-center py-12 text-gray-300">
            <Activity className="w-10 h-10 mb-3" />
            <p className="text-sm text-gray-400">No activity logged yet.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                {MODULE_ICONS[log.module] ?? "📌"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                    {log.action.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">{log.module}</span>
                  {log.entity_label && (
                    <span className="text-xs text-gray-700 font-semibold">— {log.entity_label}</span>
                  )}
                </div>

                {/* Old → New diff */}
                {log.action === "updated" && (log.old_value || log.new_value) ? (
                  <div className="mt-1.5 space-y-1">
                    {(log.details ?? "").split(" | ").filter(Boolean).map((change, i) => {
                      // Parse "Label: "old" → "new""
                      const arrowParts = change.split(" → ");
                      if (arrowParts.length === 2) {
                        const label = arrowParts[0].replace(/^(.+?):\s*"?/, "$1").replace(/"$/, "").trim();
                        const colonIdx = arrowParts[0].indexOf(":");
                        const fieldLabel = colonIdx >= 0 ? arrowParts[0].substring(0, colonIdx).trim() : arrowParts[0].trim();
                        const oldVal = arrowParts[0].substring(colonIdx + 1).trim().replace(/^"|"$/g, "");
                        const newVal = arrowParts[1].trim().replace(/^"|"$/g, "");
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 min-w-[80px] font-medium">{fieldLabel}:</span>
                            <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">{oldVal}</span>
                            <span className="text-gray-400">→</span>
                            <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">{newVal}</span>
                          </div>
                        );
                      }
                      return <p key={i} className="text-xs text-gray-400">{change}</p>;
                    })}
                  </div>
                ) : log.details ? (
                  <p className="text-xs text-gray-400 mt-0.5">{log.details}</p>
                ) : null}

                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{formatTime(log.created_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="px-5 py-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {logs.length < total && !loading && (
        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-400">Showing {logs.length} of {total}</span>
          <button onClick={loadMore} className="btn-secondary text-xs">Load More</button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserDetailClient({
  user,
  isAdmin,
  isOwnProfile,
}: {
  user: any;
  isAdmin: boolean;
  isOwnProfile: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user.avatar_url ?? '');
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetupRequired, setTotpSetupRequired] = useState(true);
  const [totpLoading, setTotpLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrSecret, setQrSecret] = useState("");

  useEffect(() => {
    getTOTPStatus(user.id).then(s => {
      setTotpEnabled(s.enabled);
      setTotpSetupRequired(s.setupRequired);
    }).catch(() => {});
  }, [user.id]);

  async function handleResetTOTP() {
    if (!confirm("Reset 2FA for this user? They will be immediately logged out and must re-scan the QR code to access the system.")) return;
    setTotpLoading(true);
    const result = await adminResetTOTP(user.id);
    if ("qrDataUrl" in result) {
      setQrDataUrl(result.qrDataUrl);
      setQrSecret(result.secret);
      setShowQrModal(true);
    }
    setTotpEnabled(false);
    setTotpSetupRequired(true);
    setTotpLoading(false);
  }

  const AVATAR_STYLES = [
    {
      label: 'Pixel',
      avatars: ['Lucy', 'Max', 'Leo', 'Ava', 'Sam', 'Zoe', 'Ben', 'Mia', 'Kai', 'Nova', 'Rex', 'Ivy', 'Jade', 'Finn', 'Luna', 'Odin'].map(seed => ({
        url: `https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}`,
        seed,
      })),
    },
  ];

  async function handleToggleActive() {
    startTransition(async () => {
      await toggleUserActive(user.id, !user.is_active);
      setConfirmToggle(false);
      router.push(`/users/${user.id}`);
      router.refresh();
    });
  }

  // Activity Logs tab: admin can see for any user; employees only for their own
  const canSeeActivity = isAdmin || isOwnProfile;
  const [tab, setTab] = useState<"details" | "activity">("details");

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateUser(user.id, fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      setIsEditing(false);
      // Use push instead of refresh so the new session cookie is picked up
      // across the entire layout (sidebar name, etc.)
      router.push(`/users/${user.id}`);
      router.refresh();
    });
  }

  const tabs = [
    { key: "details" as const, label: "Details", icon: User },
    ...(canSeeActivity ? [{ key: "activity" as const, label: "Activity Log", icon: Activity }] : []),
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/users" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-base font-bold text-blue-700">{user.full_name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1">
          <h1 className="page-title">{user.full_name}</h1>
          <p className="page-subtitle">@{user.username}{user.email ? ` · ${user.email}` : ""}</p>
        </div>
        <StatusBadge status={user.role} />
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {user.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Tab card */}
      <div className="section-card overflow-hidden">
        {/* Tab bar */}
        <div className="px-5 pt-4 border-b border-gray-100 flex items-center justify-between -mb-px">
          <div className="flex gap-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setIsEditing(false); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          {/* Edit/Deactivate — only on Details tab */}
          <div className="flex gap-2">
            {tab === "details" && !isEditing && (
              <>
                {(isAdmin || isOwnProfile) && (
                  <button onClick={() => { setIsEditing(true); setSelectedAvatar(user.avatar_url ?? ''); }} className="btn-secondary text-sm">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => setConfirmToggle(true)} className="btn-danger text-sm">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> {user.is_active ? "Deactivate" : "Activate"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Details Tab ── */}
        {tab === "details" && (
          <>
            {isEditing ? (
              <div className="p-5 bg-blue-50/30">
                <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <div className="md:col-span-2">
                    <label className="form-label text-xs">Profile Photo</label>
                    <div className="flex items-start gap-4 mb-2">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-gray-200">
                        {selectedAvatar ? (
                          <img src={selectedAvatar} alt={user.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl font-bold text-gray-400">{user.full_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {selectedAvatar && (
                        <button type="button" onClick={() => setSelectedAvatar('')} className="text-xs text-red-500 hover:text-red-600 mt-1">
                          Remove photo
                        </button>
                      )}
                    </div>
                    <input type="hidden" name="avatar_url" value={selectedAvatar} />
                    {AVATAR_STYLES.map(style => (
                      <div key={style.label} className="mb-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{style.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {style.avatars.map(av => (
                            <button
                              key={av.seed}
                              type="button"
                              onClick={() => setSelectedAvatar(av.url)}
                              className={`relative w-11 h-11 rounded-full overflow-hidden border-2 transition-all ${
                                selectedAvatar === av.url
                                  ? 'border-blue-500 ring-2 ring-blue-200 scale-110'
                                  : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                              }`}
                            >
                              <img src={av.url} alt={av.seed} className="h-full w-full object-cover" />
                              {selectedAvatar === av.url && (
                                <span className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                                  <Check className="w-4 h-4 text-blue-600" />
                                </span>
      )}

      {/* QR Code Modal — shown after Reset 2FA */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">New 2FA Setup QR</h3>
            <p className="text-sm text-gray-600 mb-4">Share this QR with <strong>{user.full_name}</strong> to re-scan on their authenticator app.</p>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center mb-4">
              <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />
              <p className="text-xs text-gray-400 mt-3 mb-1">Manual key:</p>
              <code className="text-sm font-mono bg-gray-200 px-3 py-1.5 rounded select-all break-all w-full text-center">{qrSecret}</code>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mb-4">
              User has been logged out. They must scan this QR to regain access.
            </p>
            <button onClick={() => setShowQrModal(false)} className="btn-primary text-sm w-full">
              Done
            </button>
          </div>
        </div>
      )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="form-label text-xs">Username</label>
                    <input defaultValue={user.username} className="form-input text-sm bg-gray-50 text-gray-500" disabled />
                    <p className="text-[10px] text-gray-400 mt-1">Username cannot be changed.</p>
                  </div>
                  <div>
                    <label className="form-label text-xs">Full Name <span className="text-red-500">*</span></label>
                    <input name="full_name" required defaultValue={user.full_name} className="form-input text-sm" />
                  </div>
                  <div>
                    <label className="form-label text-xs">Email</label>
                    <input name="email" type="email" defaultValue={user.email ?? ""} className="form-input text-sm" />
                  </div>
                  <div>
                    <label className="form-label text-xs">Role</label>
                    {isAdmin ? (
                      <select name="role" defaultValue={user.role} className="form-select text-sm">
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <input value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} className="form-input text-sm bg-gray-50 text-gray-500" disabled />
                    )}
                  </div>
                  <div className="md:col-span-2 border-t border-gray-100 pt-3 mt-1">
                    <label className="form-label text-xs">
                      Change Password <span className="text-gray-400 font-normal">(leave blank to keep)</span>
                    </label>
                    <input name="password" type="password" className="form-input text-sm" placeholder="••••••••" />
                  </div>
                  {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
                  <div className="md:col-span-2 flex gap-3 mt-2">
                    <button type="submit" disabled={isPending} className="btn-primary text-sm">
                      {isPending ? "Saving..." : "Save Changes"}
                    </button>
                    <button type="button" onClick={() => { setIsEditing(false); setError(null); setSelectedAvatar(user.avatar_url ?? ''); }} className="btn-secondary text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Username
                    </p>
                    <p className="text-sm font-medium font-mono bg-gray-50 px-2 py-1 rounded">@{user.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Full Name
                    </p>
                    <p className="text-sm font-medium">{user.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Email
                    </p>
                    <p className="text-sm font-medium">{user.email ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" /> Role
                    </p>
                    <StatusBadge status={user.role} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Member Since
                    </p>
                    <p className="text-sm font-medium">{formatDate(user.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Account Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="border-t border-gray-100 pt-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Two-Factor Authentication
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {totpEnabled ? (
                            <span className="text-green-700">Enabled</span>
                          ) : totpSetupRequired ? (
                            <span className="text-amber-600">Setup Required</span>
                          ) : (
                            <span className="text-red-600">Disabled</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {totpEnabled
                            ? "User authenticates with app-based 2FA"
                            : totpSetupRequired
                            ? "User must set up 2FA before accessing the system"
                            : "2FA is not required for this user"}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button onClick={handleResetTOTP} disabled={totpLoading} className="btn-secondary text-xs">
                            {totpLoading ? "..." : "Reset 2FA"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Activity Log Tab ── */}
        {tab === "activity" && canSeeActivity && (
          <UserActivityLog userId={user.id} />
        )}
      </div>

      {/* Toggle confirmation dialog */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">{user.is_active ? "Deactivate User" : "Activate User"}</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to {user.is_active ? "deactivate" : "activate"} <strong>{user.full_name}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmToggle(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleToggleActive} disabled={isPending} className="btn-primary text-sm">
                {isPending ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
