"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, User, ClipboardList, Edit, ChevronDown, TrendingUp, ImageIcon, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatAddress } from "@/lib/address";
import StatusBadge from "@/components/shared/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { updateCustomer, deleteCustomer } from "@/app/actions/customers";
import { useRouter } from "next/navigation";
import FileUploader from "@/components/shared/FileUploader";
import EditModal from "@/components/shared/EditModal";
import PasswordConfirmModal from "@/components/shared/PasswordConfirmModal";
import AddressFields from "@/components/shared/AddressFields";
import DocumentViewer from "@/components/shared/DocumentViewer";

// ── Income Details list ────────────────────────────────────────────────────────
function CustomerFinancialsList({ rentals }: { rentals: any[] }) {
  const [orderBy, setOrderBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "returned" | "booked" | "cancelled">("all");
  const [visibleCount, setVisibleCount] = useState(10);

  const filtered = rentals
    .filter(r => filterStatus === "all" ? r.status !== "cancelled" : r.status === filterStatus)
    .sort((a, b) => {
      if (orderBy === "newest") return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      if (orderBy === "oldest") return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      if (orderBy === "highest") return (b.total_amount ?? 0) - (a.total_amount ?? 0);
      return (a.total_amount ?? 0) - (b.total_amount ?? 0);
    });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Income Details</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as any); setVisibleCount(10); }} className="form-select text-xs h-8 pr-7 pl-2 appearance-none">
              <option value="all">All (excl. Cancelled)</option>
              <option value="active">Active</option>
              <option value="returned">Returned</option>
              <option value="booked">Booked</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
          </div>
          <div className="relative">
            <select value={orderBy} onChange={e => { setOrderBy(e.target.value as any); setVisibleCount(10); }} className="form-select text-xs h-8 pr-7 pl-2 appearance-none">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
          </div>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-gray-300">
          <ClipboardList className="w-8 h-8 mb-2" />
          <p className="text-sm text-gray-400">No records match this filter.</p>
        </div>
      ) : (
        <>
          <div className="overflow-auto">
            <table className="data-table">
              <thead><tr><th>Rental #</th><th>Vehicle</th><th>Period</th><th>Days</th><th>Discount</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.id}>
                    <td><a href={`/rentals/${r.id}`} className="text-blue-600 hover:underline font-medium">{r.rental_number}</a></td>
                    <td>{r.vehicle?.reg_number ?? "—"}</td>
                    <td className="text-xs text-gray-500">{formatDate(r.start_date)} → {formatDate(r.end_date)}</td>
                    <td>{r.total_days}d</td>
                    <td className="text-red-600">{r.discount > 0 ? `− ${formatCurrency(r.discount)}` : "—"}</td>
                    <td className="font-semibold text-green-700">{formatCurrency(r.total_amount ?? 0)}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Showing {visible.length} of {filtered.length}</span>
            {hasMore && <button onClick={() => setVisibleCount(c => c + 10)} className="btn-secondary text-xs">Load More</button>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Image preview card ─────────────────────────────────────────────────────────
function ImageCard({ label, url, onClick }: { label: string; url?: string | null; onClick?: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      {url ? (
        <button onClick={onClick} className="block group w-full text-left">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
            <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded transition-opacity">View</span>
            </div>
          </div>
        </button>
      ) : (
        <div className="w-full aspect-[4/3] rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1.5">
          <ImageIcon className="w-6 h-6 text-gray-300" />
          <p className="text-xs text-gray-300">Not uploaded</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CustomerDetailClient({ customer, rentals }: { customer: any; rentals: any[] }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [docViewer, setDocViewer] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [pendingFd, setPendingFd] = useState<FormData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeRental = rentals.find((r: any) => r.status === "active");
  const pastRentals = rentals.filter((r: any) => r.status !== "active");

  // Step 1: capture form data → open password confirm
  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPendingFd(fd);
    setConfirmSave(true);
  }

  // Step 2: confirmed → actually save
  async function performSave() {
    if (!pendingFd) return;
    startTransition(async () => {
      const result = await updateCustomer(customer.id, pendingFd);
      if (result && "error" in result && result.error) { setError(result.error); return; }
      setIsEditing(false);
      setPendingFd(null);
      router.push(`/customers/${customer.id}`);
      router.refresh();
    });
  }

  async function performDelete() {
    startTransition(async () => {
      const result = await deleteCustomer(customer.id);
      if ((result as any)?.error) { setError((result as any).error); return; }
      router.push("/customers");
    });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/customers" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{customer.name}</h1>
          <p className="page-subtitle">{customer.phone} · NIC: {customer.nic ?? "—"}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${customer.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {customer.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <Tabs defaultValue="details">
        <div className="section-card overflow-hidden">
          <div className="px-5 pt-4 border-b border-gray-100 pb-0 flex items-center justify-between flex-wrap gap-3">
            <TabsList className="border-b-0">
              <TabsTrigger value="details"><User className="w-3.5 h-3.5 mr-1.5 inline" />Details</TabsTrigger>
              <TabsTrigger value="rentals">
                <ClipboardList className="w-3.5 h-3.5 mr-1.5 inline" />
                Rentals {rentals.length > 0 && <span className="ml-1.5 bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full">{rentals.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="financials"><TrendingUp className="w-3.5 h-3.5 mr-1.5 inline" />Financials</TabsTrigger>
            </TabsList>
            <div className="flex gap-2 mb-2">
              <button onClick={() => { setError(null); setIsEditing(true); }} className="btn-secondary text-sm">
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>

          {/* ── DETAILS TAB ── */}
          <TabsContent value="details" className="mt-0">
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Full Name", value: customer.name },
                  { label: "NIC", value: customer.nic ?? "—" },
                  { label: "Phone", value: customer.phone ?? "—" },
                  { label: "Alt. Phone", value: customer.phone2 ?? "—" },
                  { label: "Email", value: customer.email ?? "—" },
                  { label: "Address", value: formatAddress(customer) },
                  { label: "License Number", value: customer.license_number ?? "—" },
                  { label: "License Expiry", value: formatDate(customer.license_expiry) },
                  { label: "Member Since", value: formatDate(customer.created_at) },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-gray-900">{f.value}</p>
                  </div>
                ))}
              </div>
              {customer.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg">{customer.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Documents & Photos</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <ImageCard label="NIC Front" url={customer.nic_front_url} onClick={() => setDocViewer({ open: true, url: customer.nic_front_url!, title: 'NIC Front' })} />
                  <ImageCard label="NIC Back" url={customer.nic_back_url} onClick={() => setDocViewer({ open: true, url: customer.nic_back_url!, title: 'NIC Back' })} />
                  <ImageCard label="Customer Photo" url={customer.photo_url} onClick={() => setDocViewer({ open: true, url: customer.photo_url!, title: 'Customer Photo' })} />
                  <ImageCard label="Utility Bill" url={customer.utility_bill_url} onClick={() => setDocViewer({ open: true, url: customer.utility_bill_url!, title: 'Utility Bill' })} />
                  <ImageCard label="License Front" url={customer.driving_license_front_url} onClick={() => setDocViewer({ open: true, url: customer.driving_license_front_url!, title: 'License Front' })} />
                  <ImageCard label="License Back" url={customer.driving_license_back_url} onClick={() => setDocViewer({ open: true, url: customer.driving_license_back_url!, title: 'License Back' })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { label: "Total Rentals", value: rentals.length },
                  { label: "Active Now", value: activeRental ? 1 : 0 },
                  { label: "Total Spent", value: formatCurrency(rentals.reduce((s: number, r: any) => s + (r.total_amount ?? 0), 0)) },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── RENTALS TAB ── */}
          <TabsContent value="rentals" className="mt-0">
            <div className="p-5 space-y-5">
              {activeRental && (
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-3">Currently Active</p>
                  <div className="border-2 border-blue-300 bg-blue-50/40 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <a href={`/rentals/${activeRental.id}`} className="font-semibold text-blue-600 hover:underline">{activeRental.rental_number}</a>
                        <p className="text-sm text-gray-600 mt-0.5">{activeRental.vehicle?.reg_number ?? "—"} · {activeRental.vehicle?.brand} {activeRental.vehicle?.model}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(activeRental.total_amount ?? 0)}</p>
                        <p className="text-xs text-gray-400">{formatDate(activeRental.start_date)} → {formatDate(activeRental.end_date)}</p>
                      </div>
                      <StatusBadge status={activeRental.status} />
                    </div>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  {activeRental ? "Past Rentals" : "All Rentals"}
                </p>
                {pastRentals.length === 0 && !activeRental && (
                  <div className="flex flex-col items-center py-12 text-gray-300">
                    <ClipboardList className="w-10 h-10 mb-2" />
                    <p className="text-sm text-gray-400">No rental history yet.</p>
                  </div>
                )}
                {pastRentals.length > 0 && (
                  <table className="data-table">
                    <thead><tr><th>Rental #</th><th>Vehicle</th><th>Start</th><th>End</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {pastRentals.map((r: any) => (
                        <tr key={r.id}>
                          <td><a href={`/rentals/${r.id}`} className="text-blue-600 hover:underline font-medium">{r.rental_number}</a></td>
                          <td>{r.vehicle?.reg_number ?? "—"}</td>
                          <td>{formatDate(r.start_date)}</td>
                          <td>{formatDate(r.end_date)}</td>
                          <td className="font-medium">{formatCurrency(r.total_amount ?? 0)}</td>
                          <td><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── FINANCIALS TAB ── */}
          <TabsContent value="financials" className="mt-0">
            <CustomerFinancialsList rentals={rentals} />
          </TabsContent>
        </div>
      </Tabs>

      {/* ── EDIT MODAL ── */}
      <EditModal open={isEditing} title="Edit Customer" onClose={() => { setIsEditing(false); setError(null); setPendingFd(null); }}>
        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: "name", label: "Full Name", required: true, defaultValue: customer.name },
            { name: "nic", label: "NIC", defaultValue: customer.nic },
            { name: "phone", label: "Phone", defaultValue: customer.phone },
            { name: "phone2", label: "Alt. Phone", defaultValue: customer.phone2 },
            { name: "email", label: "Email", type: "email", defaultValue: customer.email },
          ].map(f => (
            <div key={f.name}>
              <label className="form-label text-xs">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
              <input name={f.name} type={f.type ?? "text"} required={f.required} defaultValue={f.defaultValue ?? ""} className="form-input text-sm" />
            </div>
          ))}
          <AddressFields defaultValues={customer} />
          <div>
            <label className="form-label text-xs">License Number</label>
            <input name="license_number" defaultValue={customer.license_number ?? ""} className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label text-xs">License Expiry</label>
            <input name="license_expiry" type="date" defaultValue={customer.license_expiry ? new Date(customer.license_expiry).toISOString().split('T')[0] : ""} className="form-input text-sm" />
          </div>
          <div className="md:col-span-3">
            <label className="form-label text-xs">Notes</label>
            <textarea name="notes" defaultValue={customer.notes ?? ""} className="form-input text-sm resize-none h-20" />
          </div>
          <div className="md:col-span-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 border-t border-gray-100 pt-4">Documents & Photos</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FileUploader label="NIC Front (JPG/PDF, max 5MB)" fieldName="nic_front" bucket="customers" folder={customer.id} maxFiles={1} initialFiles={customer.nic_front_url ? [{ url: customer.nic_front_url, path: customer.nic_front_path || customer.nic_front_url }] : []} />
              <FileUploader label="NIC Back (JPG/PDF, max 5MB)" fieldName="nic_back" bucket="customers" folder={customer.id} maxFiles={1} initialFiles={customer.nic_back_url ? [{ url: customer.nic_back_url, path: customer.nic_back_path || customer.nic_back_url }] : []} />
              <FileUploader label="Customer Photo (JPG/PNG, max 5MB)" fieldName="photo" bucket="customers" folder={customer.id} maxFiles={1} initialFiles={customer.photo_url ? [{ url: customer.photo_url, path: customer.photo_path || customer.photo_url }] : []} />
              <FileUploader label="Utility Bill (JPG/PDF, max 5MB)" fieldName="utility_bill" bucket="customers" folder={customer.id} maxFiles={1} initialFiles={customer.utility_bill_url ? [{ url: customer.utility_bill_url, path: customer.utility_bill_path || customer.utility_bill_url }] : []} />
              <FileUploader label="License Image Front (JPG/PDF, max 5MB)" fieldName="driving_license_front" bucket="customers" folder={customer.id} maxFiles={1} initialFiles={customer.driving_license_front_url ? [{ url: customer.driving_license_front_url, path: customer.driving_license_front_path || customer.driving_license_front_url }] : []} />
              <FileUploader label="License Image Back (JPG/PDF, max 5MB)" fieldName="driving_license_back" bucket="customers" folder={customer.id} maxFiles={1} initialFiles={customer.driving_license_back_url ? [{ url: customer.driving_license_back_url, path: customer.driving_license_back_path || customer.driving_license_back_url }] : []} />
            </div>
          </div>
          {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
          <div className="md:col-span-3 flex gap-3 justify-end pt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setIsEditing(false); setError(null); setPendingFd(null); }} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary text-sm">{isPending ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>

        {/* Password confirmation — triggered when form is submitted */}
        <PasswordConfirmModal
          open={confirmSave}
          onOpenChange={setConfirmSave}
          title="Confirm Changes"
          description="Enter your password to save customer changes."
          onConfirm={performSave}
        />

        <PasswordConfirmModal
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete Customer"
          description={`Are you sure you want to delete ${customer.name}? This cannot be undone.`}
          onConfirm={performDelete}
          variant="danger"
        />

        <DocumentViewer open={docViewer.open} onOpenChange={(o) => setDocViewer({ ...docViewer, open: o })} url={docViewer.url} title={docViewer.title} />
      </EditModal>
    </div>
  );
}
