"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Edit, Trash2, ClipboardList, Users, ChevronDown, ImageIcon } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatAddress } from "@/lib/address";
import PasswordConfirmModal from "@/components/shared/PasswordConfirmModal";
import FileUploader from "@/components/shared/FileUploader";
import EditModal from "@/components/shared/EditModal";
import { updateGuarantor, deleteGuarantor } from "@/app/actions/suppliers";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StatusBadge from "@/components/shared/StatusBadge";
import AddressFields from "@/components/shared/AddressFields";
import DocumentViewer from "@/components/shared/DocumentViewer";

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

export default function GuarantorDetailClient({
  guarantor,
  rentals,
}: {
  guarantor: any;
  rentals: any[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [pendingFd, setPendingFd] = useState<FormData | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [docViewer, setDocViewer] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });

  const [rentalOrder, setRentalOrder] = useState<"newest" | "oldest">("newest");
  const [rentalVisible, setRentalVisible] = useState(10);

  const sortedRentals = [...rentals].sort((a, b) => {
    if (rentalOrder === "newest") return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });
  const visibleRentals = sortedRentals.slice(0, rentalVisible);

  const uniqueCustomers = Array.from(
    new Map(rentals.filter(r => r.customer).map(r => [r.customer.id, r.customer])).values()
  );

  // Step 1: capture form → open password modal
  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPendingFd(fd);
    setConfirmSave(true);
  }

  // Step 2: confirmed → save
  async function performSave() {
    if (!pendingFd) return;
    startTransition(async () => {
      const result = await updateGuarantor(guarantor.id, pendingFd);
      if (result && "error" in result && result.error) { setError(result.error); return; }
      setIsEditing(false);
      setPendingFd(null);
      router.push(`/guarantors/${guarantor.id}`);
      router.refresh();
    });
  }

  async function handleDelete() {
    startTransition(async () => {
      await deleteGuarantor(guarantor.id);
      router.push("/guarantors");
    });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/guarantors" className="p-2 border border-gray-100 rounded-lg hover:bg-gray-50 text-gray-500 bg-white shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {guarantor.name}
              <Shield className="w-5 h-5 text-gray-400" />
            </h1>
            {guarantor.customer && (
              <p className="text-sm text-gray-500">
                <Link href={`/customers/${guarantor.customer.id}`} className="text-blue-500 hover:underline">
                  {guarantor.customer.name}
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDeleteModal(true)} className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 text-sm">
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </button>
          <button onClick={() => { setError(null); setIsEditing(true); }} className="btn-secondary text-sm">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <div className="section-card overflow-hidden">
          <div className="px-5 pt-4 border-b border-gray-100 pb-0">
            <TabsList className="border-b-0">
              <TabsTrigger value="details"><Shield className="w-3.5 h-3.5 mr-1.5 inline" />Details</TabsTrigger>
              <TabsTrigger value="rentals">
                <ClipboardList className="w-3.5 h-3.5 mr-1.5 inline" />
                Rentals
                {rentals.length > 0 && <span className="ml-1.5 bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full">{rentals.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="customers">
                <Users className="w-3.5 h-3.5 mr-1.5 inline" />
                Customers
                {uniqueCustomers.length > 0 && <span className="ml-1.5 bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">{uniqueCustomers.length}</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── DETAILS ── */}
          <TabsContent value="details" className="mt-0">
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Full Name", value: guarantor.name },
                  { label: "NIC", value: guarantor.nic ?? "—" },
                  { label: "Phone", value: guarantor.phone ?? "—" },
                  { label: "Alt. Phone", value: guarantor.phone2 ?? "—" },
                  { label: "Relationship", value: guarantor.relationship ?? "—" },
                  { label: "Address", value: formatAddress(guarantor) },
                  { label: "Added On", value: formatDate(guarantor.created_at) },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-gray-900">{f.value}</p>
                  </div>
                ))}
                <div className="col-span-2 md:col-span-3">
                  <p className="text-xs text-gray-400 mb-0.5">Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{guarantor.notes || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Documents & Photos</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <ImageCard label="NIC Front" url={guarantor.nic_front_url} onClick={() => setDocViewer({ open: true, url: guarantor.nic_front_url!, title: 'NIC Front' })} />
                  <ImageCard label="NIC Back" url={guarantor.nic_back_url} onClick={() => setDocViewer({ open: true, url: guarantor.nic_back_url!, title: 'NIC Back' })} />
                  <ImageCard label="Photo" url={guarantor.photo_url} onClick={() => setDocViewer({ open: true, url: guarantor.photo_url!, title: 'Photo' })} />
                  <ImageCard label="Utility Bill" url={guarantor.utility_bill_url} onClick={() => setDocViewer({ open: true, url: guarantor.utility_bill_url!, title: 'Utility Bill' })} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── RENTALS ── */}
          <TabsContent value="rentals" className="mt-0">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Rental History ({rentals.length} total)</p>
                {rentals.length > 0 && (
                  <div className="relative">
                    <select value={rentalOrder} onChange={e => { setRentalOrder(e.target.value as any); setRentalVisible(10); }} className="form-select text-xs h-8 pr-7 pl-2 appearance-none">
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                  </div>
                )}
              </div>
              {rentals.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-300">
                  <ClipboardList className="w-10 h-10 mb-2" />
                  <p className="text-sm text-gray-400">No rentals recorded for this guarantor.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-auto">
                    <table className="data-table">
                      <thead><tr><th>Rental #</th><th>Customer</th><th>Vehicle</th><th>Period</th><th>Days</th><th>Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {visibleRentals.map(r => (
                          <tr key={r.id}>
                            <td><Link href={`/rentals/${r.id}`} className="text-blue-600 hover:underline font-medium">{r.rental_number}</Link></td>
                            <td>{r.customer ? <Link href={`/customers/${r.customer.id}`} className="text-gray-700 hover:text-blue-600">{r.customer.name}</Link> : "—"}</td>
                            <td>{r.vehicle ? <Link href={`/vehicles/${r.vehicle.id}`} className="text-gray-700 hover:text-blue-600">{r.vehicle.reg_number}</Link> : "—"}</td>
                            <td className="text-xs text-gray-500">{formatDate(r.start_date)} → {formatDate(r.end_date)}</td>
                            <td>{r.total_days}d</td>
                            <td className="font-semibold">{formatCurrency(r.total_amount ?? 0)}</td>
                            <td><StatusBadge status={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">Showing {visibleRentals.length} of {sortedRentals.length}</span>
                    {sortedRentals.length > rentalVisible && (
                      <button onClick={() => setRentalVisible(c => c + 10)} className="btn-secondary text-xs">Load More</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── CUSTOMERS ── */}
          <TabsContent value="customers" className="mt-0">
            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Linked Customers ({uniqueCustomers.length})</p>
              {uniqueCustomers.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-300">
                  <Users className="w-10 h-10 mb-2" />
                  <p className="text-sm text-gray-400">No customers linked through rentals yet.</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Phone</th><th>NIC</th><th>Email</th><th>Rentals</th></tr></thead>
                    <tbody>
                      {uniqueCustomers.map(c => {
                        const customerRentals = rentals.filter(r => r.customer?.id === c.id);
                        return (
                          <tr key={c.id}>
                            <td><Link href={`/customers/${c.id}`} className="text-blue-600 hover:underline font-medium">{c.name}</Link></td>
                            <td>{c.phone ?? "—"}</td>
                            <td className="text-gray-500">{c.nic ?? "—"}</td>
                            <td className="text-gray-500">{c.email ?? "—"}</td>
                            <td><span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">{customerRentals.length}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* ── EDIT MODAL ── */}
      <EditModal open={isEditing} title="Edit Guarantor" onClose={() => { setIsEditing(false); setError(null); setPendingFd(null); }}>
        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <input type="hidden" name="customer_id" value={guarantor.customer_id || ""} />
          <div>
            <label className="form-label text-xs">Full Name <span className="text-red-500">*</span></label>
            <input name="name" required defaultValue={guarantor.name} className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label text-xs">NIC</label>
            <input name="nic" defaultValue={guarantor.nic ?? ""} className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label text-xs">Phone</label>
            <input name="phone" defaultValue={guarantor.phone ?? ""} className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label text-xs">Alternative Phone</label>
            <input name="phone2" defaultValue={guarantor.phone2 ?? ""} className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label text-xs">Relationship to Customer</label>
            <input name="relationship" defaultValue={guarantor.relationship ?? ""} className="form-input text-sm" />
          </div>
          <AddressFields defaultValues={guarantor} className="md:col-span-2" />
          <div className="md:col-span-2">
            <label className="form-label text-xs">Notes</label>
            <textarea name="notes" defaultValue={guarantor.notes ?? ""} className="form-input text-sm resize-none h-20" />
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 border-t border-gray-100 pt-4">Documents & Photos</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
              <FileUploader label="NIC Front (JPG/PNG/PDF, max 5MB)" fieldName="nic_front" bucket="guarantors" folder={guarantor.id} maxFiles={1} initialFiles={guarantor.nic_front_url ? [{ url: guarantor.nic_front_url, path: guarantor.nic_front_path || guarantor.nic_front_url }] : []} />
              <FileUploader label="NIC Back (JPG/PNG/PDF, max 5MB)" fieldName="nic_back" bucket="guarantors" folder={guarantor.id} maxFiles={1} initialFiles={guarantor.nic_back_url ? [{ url: guarantor.nic_back_url, path: guarantor.nic_back_path || guarantor.nic_back_url }] : []} />
              <FileUploader label="Photo (JPG/PNG, max 5MB)" fieldName="photo" bucket="guarantors" folder={guarantor.id} maxFiles={1} initialFiles={guarantor.photo_url ? [{ url: guarantor.photo_url, path: guarantor.photo_path || guarantor.photo_url }] : []} />
              <FileUploader label="Utility Bill (JPG/PNG/PDF, max 5MB)" fieldName="utility_bill" bucket="guarantors" folder={guarantor.id} maxFiles={1} initialFiles={guarantor.utility_bill_url ? [{ url: guarantor.utility_bill_url, path: guarantor.utility_bill_path || guarantor.utility_bill_url }] : []} />
            </div>
          </div>
          {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="md:col-span-2 flex gap-3 justify-end pt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setIsEditing(false); setError(null); setPendingFd(null); }} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary text-sm">{isPending ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>

        <PasswordConfirmModal
          open={confirmSave}
          onOpenChange={setConfirmSave}
          title="Confirm Changes"
          description="Enter your password to save guarantor changes."
          onConfirm={performSave}
        />
      </EditModal>

      {/* Delete confirmation */}
      <PasswordConfirmModal
        open={deleteModal}
        onOpenChange={setDeleteModal}
        title="Delete Guarantor"
        description="Remove this guarantor record."
        onConfirm={handleDelete}
        variant="danger"
      />

      <DocumentViewer open={docViewer.open} onOpenChange={(o) => setDocViewer({ ...docViewer, open: o })} url={docViewer.url} title={docViewer.title} />
    </div>
  );
}
