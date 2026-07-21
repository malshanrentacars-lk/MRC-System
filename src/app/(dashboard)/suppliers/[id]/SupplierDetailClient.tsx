"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Car, Edit, TrendingUp, DollarSign, ImageIcon, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatAddress } from "@/lib/address";
import StatusBadge from "@/components/shared/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { updateSupplier, deleteSupplier } from "@/app/actions/suppliers";
import { useRouter } from "next/navigation";
import FileUploader from "@/components/shared/FileUploader";
import EditModal from "@/components/shared/EditModal";
import PasswordConfirmModal from "@/components/shared/PasswordConfirmModal";
import { BANKS } from "@/lib/vehicleData";
import DocumentViewer from "@/components/shared/DocumentViewer";
import AddressFields from "@/components/shared/AddressFields";
import type { Company } from "@/types";

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

export default function SupplierDetailClient({ supplier, vehicles }: { supplier: any; vehicles: any[] }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingFd, setPendingFd] = useState<FormData | null>(null);
  const [docViewer, setDocViewer] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [visibleVehicleCount, setVisibleVehicleCount] = useState(10);
  const [vehiclesTabCount, setVehiclesTabCount] = useState(20);

  const nameParts = supplier.name.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  // Step 1: capture form + open password prompt
  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const nicFront = (fd.get("nic_front_url") as string) || "";
    const nicBack = (fd.get("nic_back_url") as string) || "";
    if (!nicFront || !nicBack) {
      setError("Please upload NIC Front and NIC Back documents.");
      return;
    }

    const fname = (fd.get("first_name") as string ?? "").trim();
    const lname = (fd.get("last_name") as string ?? "").trim();
    fd.set("name", [fname, lname].filter(Boolean).join(" "));
    setPendingFd(fd);
    setConfirmSave(true);
  }

  // Step 2: password confirmed → save
  async function performSave() {
    if (!pendingFd) return;
    startTransition(async () => {
      const result = await updateSupplier(supplier.id, pendingFd);
      if (result && "error" in result && result.error) { setError(result.error); return; }
      setIsEditing(false);
      setPendingFd(null);
      router.push(`/suppliers/${supplier.id}`);
      router.refresh();
    });
  }

  async function performDelete() {
    startTransition(async () => {
      const result = await deleteSupplier(supplier.id);
      if ((result as any)?.error) { setError((result as any).error); return; }
      router.push("/suppliers");
    });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/suppliers" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{supplier.name}</h1>
          <p className="page-subtitle">{supplier.phone} · NIC: {supplier.nic ?? "—"}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${supplier.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {supplier.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <Tabs defaultValue="details">
        <div className="section-card overflow-hidden">
          <div className="px-5 pt-4 border-b border-gray-100 flex items-center justify-between pb-0 flex-wrap gap-3">
            <TabsList className="border-b-0">
              <TabsTrigger value="details"><Building2 className="w-3.5 h-3.5 mr-1.5 inline" />Details</TabsTrigger>
              <TabsTrigger value="vehicles">
                <Car className="w-3.5 h-3.5 mr-1.5 inline" />
                Vehicles {vehicles.length > 0 && <span className="ml-1.5 bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full">{vehicles.length}</span>}
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

          {/* ── DETAILS ── */}
          <TabsContent value="details" className="mt-0">
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Name", value: supplier.name },
                  { label: "NIC", value: supplier.nic ?? "—" },
                  { label: "Phone", value: supplier.phone ?? "—" },
                  { label: "Alt. Phone", value: supplier.phone2 ?? "—" },
                  { label: "Email", value: supplier.email ?? "—" },
                  { label: "Address", value: formatAddress(supplier) },
                  { label: "Company", value: supplier.company?.name ?? "—" },
                  { label: "Added On", value: formatDate(supplier.created_at) },
                  { label: "Vehicles Supplied", value: vehicles.length },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-gray-900">{f.value}</p>
                  </div>
                ))}
              </div>
              {supplier.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg">{supplier.notes}</p>
                </div>
              )}
              
              {/* Bank Details Section */}
              {(supplier.bank || supplier.account_number || supplier.branch) && (
                <div className="border-t border-gray-100 pt-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Bank Details</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: "Bank", value: supplier.bank ?? "—" },
                      { label: "Account Number", value: supplier.account_number ?? "—" },
                      { label: "Branch", value: supplier.branch ?? "—" },
                    ].map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                        <p className="text-sm font-medium text-gray-900">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 border-t border-gray-100 pt-6">Documents & Photos</p>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                  <ImageCard label="NIC Front" url={supplier.nic_front_url} onClick={() => setDocViewer({ open: true, url: supplier.nic_front_url!, title: 'NIC Front' })} />
                  <ImageCard label="NIC Back" url={supplier.nic_back_url} onClick={() => setDocViewer({ open: true, url: supplier.nic_back_url!, title: 'NIC Back' })} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── VEHICLES ── */}
          <TabsContent value="vehicles" className="mt-0">
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Supplied Vehicles ({vehicles.length})</p>
              {vehicles.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-300">
                  <Car className="w-10 h-10 mb-2" />
                  <p className="text-sm text-gray-400">No vehicles from this supplier.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-auto">
                    <table className="data-table">
                      <thead><tr><th>Reg #</th><th>Brand</th><th>Model</th><th>Year</th><th>Type</th><th>Status</th></tr></thead>
                      <tbody>
                        {vehicles.slice(0, vehiclesTabCount).map((v: any) => (
                          <tr key={v.id} onClick={() => router.push(`/vehicles/${v.id}`)} className="cursor-pointer transition-all duration-200 ease-out hover:bg-blue-50/80 hover:shadow-md hover:-translate-y-px hover:border-l-[3px] hover:border-l-blue-500 active:bg-blue-100 active:scale-[0.995] active:shadow-sm">
                            <td className="font-medium text-blue-600">{v.reg_number}</td>
                            <td>{v.brand}</td><td>{v.model}</td>
                            <td>{v.year ?? "—"}</td><td>{v.type}</td>
                            <td><StatusBadge status={v.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400">Showing {Math.min(vehiclesTabCount, vehicles.length)} of {vehicles.length}</span>
                    {vehicles.length > vehiclesTabCount && (
                      <button onClick={() => setVehiclesTabCount(c => c + 20)} className="btn-secondary text-xs">Load More</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── FINANCIALS ── */}
          <TabsContent value="financials" className="mt-0">
            <div className="p-5 space-y-5">
              {vehicles.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-300">
                  <TrendingUp className="w-10 h-10 mb-2" />
                  <p className="text-sm text-gray-400">No vehicles supplied — no financial data yet.</p>
                </div>
              ) : (() => {
                const totalRevenue = vehicles.reduce((sum: number, v: any) =>
                  sum + (v.rentals || []).reduce((rSum: number, r: any) =>
                    r.status !== 'cancelled' ? rSum + (r.total_amount || 0) : rSum, 0), 0);
                const totalExpenses = 0;
                const netValue = totalRevenue - totalExpenses;
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                        <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Generated Revenue</p>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
                        <p className="text-[10px] text-green-500 mt-1 uppercase">From all rentals</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                        <DollarSign className="w-6 h-6 text-red-400 mx-auto mb-2" />
                        <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1">Expenses</p>
                        <p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
                        <p className="text-[10px] text-red-400 mt-1 uppercase">Recorded costs</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                        <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Net Value</p>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(netValue)}</p>
                        <p className="text-[10px] text-blue-500 mt-1 uppercase">Revenue − Expenses</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Vehicle Breakdown</p>
                      <table className="data-table">
                        <thead><tr><th>Reg #</th><th>Brand / Model</th><th>Status</th><th>Rentals</th><th>Revenue Gen.</th></tr></thead>
                        <tbody>
                          {vehicles.slice(0, visibleVehicleCount).map((v: any) => {
                            const vRevenue = (v.rentals || []).reduce((rSum: number, r: any) =>
                              r.status !== 'cancelled' ? rSum + (r.total_amount || 0) : rSum, 0);
                            return (
                              <tr key={v.id}>
                                <td><Link href={`/vehicles/${v.id}`} className="text-blue-600 hover:underline font-medium">{v.reg_number}</Link></td>
                                <td>{v.brand} {v.model}</td>
                                <td><StatusBadge status={v.status} /></td>
                                <td>{(v.rentals || []).length}</td>
                                <td className="font-semibold text-green-700">{formatCurrency(vRevenue)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-400">Showing {Math.min(visibleVehicleCount, vehicles.length)} of {vehicles.length}</span>
                        {vehicles.length > visibleVehicleCount && (
                          <button onClick={() => setVisibleVehicleCount(c => c + 10)} className="btn-secondary text-xs">Load More</button>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* ── EDIT MODAL ── */}
      <EditModal open={isEditing} title="Edit Supplier" onClose={() => { setIsEditing(false); setError(null); setPendingFd(null); }}>
        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="form-label text-xs">First Name <span className="text-red-500">*</span></label>
            <input name="first_name" required defaultValue={firstName} className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label text-xs">Last Name <span className="text-red-500">*</span></label>
            <input name="last_name" required defaultValue={lastName} className="form-input text-sm" />
          </div>
          {[
            { name: "phone", label: "Phone", defaultValue: supplier.phone, required: true },
            { name: "phone2", label: "Phone 2", defaultValue: supplier.phone2 },
            { name: "email", label: "Email", defaultValue: supplier.email },
          ].map(f => (
            <div key={f.name}>
              <label className="form-label text-xs">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
              <input name={f.name} defaultValue={f.defaultValue ?? ""} required={f.required || false} className="form-input text-sm" />
            </div>
          ))}
          <div>
            <label className="form-label text-xs">NIC <span className="text-red-500">*</span></label>
            <input name="nic" required defaultValue={supplier.nic ?? ""} className="form-input text-sm uppercase" />
          </div>
          <AddressFields defaultValues={supplier} />
          
          {/* Bank Details Section */}
          <div>
            <label className="form-label text-xs">Bank <span className="text-red-500">*</span></label>
            <select name="bank" required defaultValue={supplier.bank ?? ""} className="form-select text-sm">
              <option value="">— Select Bank —</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Account Number <span className="text-red-500">*</span></label>
            <input name="account_number" type="text" required defaultValue={supplier.account_number ?? ""} className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label text-xs">Branch <span className="text-red-500">*</span></label>
            <input name="branch" required defaultValue={supplier.branch ?? ""} className="form-input text-sm" />
          </div>
          
          <div className="md:col-span-3">
            <label className="form-label text-xs">Notes</label>
            <textarea name="notes" defaultValue={supplier.notes ?? ""} className="form-input text-sm resize-none h-20" />
          </div>
          <div className="md:col-span-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 border-t border-gray-100 pt-4">Documents & Photos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FileUploader label="NIC Front (JPG/PNG/PDF, max 5MB) *" fieldName="nic_front" bucket="suppliers" folder={`${supplier.nic || supplier.id}/nic_front`} maxFiles={1} initialFiles={supplier.nic_front_url ? [{ url: supplier.nic_front_url, path: supplier.nic_front_url }] : []} />
              <FileUploader label="NIC Back (JPG/PNG/PDF, max 5MB) *" fieldName="nic_back" bucket="suppliers" folder={`${supplier.nic || supplier.id}/nic_back`} maxFiles={1} initialFiles={supplier.nic_back_url ? [{ url: supplier.nic_back_url, path: supplier.nic_back_url }] : []} />
            </div>
          </div>
          {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
          <div className="md:col-span-3 flex gap-3 justify-end pt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setIsEditing(false); setError(null); setPendingFd(null); }} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary text-sm">{isPending ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>

        <PasswordConfirmModal
          open={confirmSave}
          onOpenChange={setConfirmSave}
          title="Confirm Changes"
          description="Enter your password to save supplier changes."
          onConfirm={performSave}
        />

        <PasswordConfirmModal
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete Supplier"
          description={`Are you sure you want to delete ${supplier.name}? This cannot be undone.`}
          onConfirm={performDelete}
          variant="danger"
        />
        <DocumentViewer open={docViewer.open} onOpenChange={(o) => setDocViewer({ ...docViewer, open: o })} url={docViewer.url} title={docViewer.title} />
      </EditModal>
    </div>
  );
}
