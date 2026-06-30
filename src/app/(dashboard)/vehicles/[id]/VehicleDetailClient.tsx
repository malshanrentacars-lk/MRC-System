"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Vehicle, Supplier, Rental } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { updateVehicle, deleteVehicle, uploadVehiclePhoto, deleteVehiclePhoto } from "@/app/actions/vehicles";
import PasswordConfirmModal from "@/components/shared/PasswordConfirmModal";
import StatusBadge from "@/components/shared/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EditModal from "@/components/shared/EditModal";
import {
  Edit, Trash2, Upload, X, Plus, Minus, Camera,
  Car, Shield, DollarSign, TrendingUp, Image as ImageIcon, ClipboardList, ChevronDown
} from "lucide-react";
import { BRANDS, COLORS, YEARS, getModels, FUEL_TYPES, TRANSMISSION_TYPES } from "@/lib/vehicleData";
import FileUploader, { UploadedFile } from "@/components/shared/FileUploader";

interface Props {
  vehicle: Vehicle;
  suppliers: Supplier[];
  rentals: Rental[];
}

function getFilename(url: string): string {
  return url.split('/').pop()?.split('?')[0] || 'Document';
}

// Default 4 rate tiers
const DEFAULT_TIERS = [
  { id: "", vehicle_id: "", days_from: 1, days_to: 3, rate_per_day: 0 },
  { id: "", vehicle_id: "", days_from: 4, days_to: 7, rate_per_day: 0 },
  { id: "", vehicle_id: "", days_from: 8, days_to: 14, rate_per_day: 0 },
  { id: "", vehicle_id: "", days_from: 15, days_to: undefined, rate_per_day: 0 },
];

// ─────────────────────────────────────────────────────────────
// Financials Tab sub-component (keeps VehicleDetailClient lean)
// ─────────────────────────────────────────────────────────────
function FinancialsTab({
  rentals, totalRevenue, activeRentals, completedRentals
}: {
  rentals: Rental[];
  totalRevenue: number;
  activeRentals: Rental[];
  completedRentals: Rental[];
}) {
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
    <div className="p-5 space-y-6">
      {/* Financial Summary — TOP */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Financial Summary</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-green-500 mt-1">{rentals.filter(r => r.status !== "cancelled").length} rentals</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
            <DollarSign className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1">Total Expenditure</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(0)}</p>
            <p className="text-xs text-red-400 mt-1">Service costs (manual)</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Net Income</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-blue-500 mt-1">Based on completed rentals</p>
          </div>
        </div>
      </div>

      {/* Income Details — BELOW Financial Summary */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Income Details</p>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value as any); setVisibleCount(10); }}
                className="form-select text-xs h-8 pr-7 pl-2 appearance-none"
              >
                <option value="all">All (excl. Cancelled)</option>
                <option value="active">Active</option>
                <option value="returned">Returned</option>
                <option value="booked">Booked</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
            {/* Order by */}
            <div className="relative">
              <select
                value={orderBy}
                onChange={e => { setOrderBy(e.target.value as any); setVisibleCount(10); }}
                className="form-select text-xs h-8 pr-7 pl-2 appearance-none"
              >
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
          <div className="flex flex-col items-center py-8 text-gray-300">
            <ClipboardList className="w-8 h-8 mb-2" />
            <p className="text-sm text-gray-400">No income records match this filter.</p>
          </div>
        ) : (
          <>
            <div className="overflow-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Rental #</th><th>Customer</th><th>Period</th><th>Days</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {visible.map(r => (
                    <tr key={r.id}>
                      <td><a href={`/rentals/${r.id}`} className="text-blue-600 hover:underline font-medium">{r.rental_number}</a></td>
                      <td>{(r.customer as any)?.name ?? "—"}</td>
                      <td className="text-xs text-gray-500">{formatDate(r.start_date)} → {formatDate(r.end_date)}</td>
                      <td>{r.total_days}d</td>
                      <td className="font-semibold text-green-700">{formatCurrency(r.total_amount ?? 0)}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">Showing {visible.length} of {filtered.length}</span>
              {hasMore && (
                <button onClick={() => setVisibleCount(c => c + 10)} className="btn-secondary text-xs">
                  Load More
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* 4 stat mini-cards — at the very bottom */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Rentals", value: activeRentals.length, color: "text-blue-600" },
          { label: "Completed", value: completedRentals.length, color: "text-green-600" },
          { label: "Cancelled", value: rentals.filter(r => r.status === "cancelled").length, color: "text-red-500" },
          { label: "Total Days Rented", value: rentals.reduce((sum, r) => sum + (r.total_days ?? 0), 0), color: "text-gray-900" },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-50 rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VehicleDetailClient({ vehicle: initial, suppliers, rentals }: Props) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState(initial);
  // Separate local photos state — updates immediately on upload/delete
  // so the Images tab reflects changes without waiting for a server round-trip
  const [localPhotos, setLocalPhotos] = useState<any[]>(initial.photos ?? []);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [editFormData, setEditFormData] = useState<FormData | null>(null);
  
  // Rate tiers: if existing tiers exist use them (up to 4), else show 4 defaults
  const initTiers = vehicle.rate_tiers && vehicle.rate_tiers.length > 0
    ? vehicle.rate_tiers.slice(0, 4)
    : DEFAULT_TIERS.map(t => ({ ...t, vehicle_id: vehicle.id }));
  const [rateTiers, setRateTiers] = useState(initTiers);
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Controlled states for cascading Brand -> Model
  const [editBrand, setEditBrand] = useState(vehicle.brand || "Toyota");
  const [editModel, setEditModel] = useState(vehicle.model || "Corolla");
  const availableModels = getModels(editBrand);
  const [editSource, setEditSource] = useState<"Company" | "Supplier">(
    (vehicle.source as "Company" | "Supplier") || "Company"
  );
  const [editPayFreq, setEditPayFreq] = useState(vehicle.payment_frequency || "1_month");
  const [editPayDays, setEditPayDays] = useState(vehicle.payment_days || "");

  function calcPayDays(freq: string): string {
    const today = new Date();
    const d1 = new Date(today); d1.setDate(today.getDate() + 15);
    const d2 = new Date(today); d2.setDate(today.getDate() + 30);
    if (freq === "15_days") return `${d1.getDate()},${d2.getDate()}`;
    return `${d2.getDate()}`;
  }

  function handleEditPayFreqChange(freq: string) {
    setEditPayFreq(freq);
    setEditPayDays(calcPayDays(freq));
  }

  function handleEditBrandChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newBrand = e.target.value;
    setEditBrand(newBrand);
    const newModels = getModels(newBrand);
    setEditModel(newModels.includes(vehicle.model) ? vehicle.model : newModels[0]);
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Explicitly set controlled dropdown values in case they differ
    fd.set("brand", editBrand);
    fd.set("model", editModel);
    fd.set("rate_tiers", JSON.stringify(rateTiers.map(t => ({ days_from: t.days_from, days_to: t.days_to, rate_per_day: t.rate_per_day }))));
    setEditFormData(fd);
    setConfirmEdit(true);
  }

  async function performEdit() {
    if (!editFormData) return;
    startTransition(async () => {
      const result = await updateVehicle(vehicle.id, editFormData);
      if (result.error) { setError(result.error); return; }
      setEditing(false);
      // push forces a new navigation so useState(initial) re-initialises
      // with the latest photos from the server
      router.push(`/vehicles/${vehicle.id}`);
      router.refresh();
    });
  }

  async function performDelete() {
    startTransition(async () => {
      await deleteVehicle(vehicle.id);
      router.push("/vehicles");
    });
  }



  // Financial calculations from rentals
  const totalRevenue = rentals
    .filter(r => r.status !== "cancelled")
    .reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
  const activeRentals = rentals.filter(r => r.status === "active");
  const completedRentals = rentals.filter(r => r.status === "returned");

  return (
    <div>
      <Tabs defaultValue="details">
        <div className="section-card overflow-hidden">
          <div className="px-5 pt-4 flex items-center justify-between border-b border-gray-100 pb-0 flex-wrap gap-3">
            <TabsList className="border-b-0">
              <TabsTrigger value="details"><Car className="w-3.5 h-3.5 mr-1.5 inline" />Details</TabsTrigger>
              <TabsTrigger value="images"><ImageIcon className="w-3.5 h-3.5 mr-1.5 inline" />Images</TabsTrigger>
              <TabsTrigger value="insurance"><Shield className="w-3.5 h-3.5 mr-1.5 inline" />Insurance & Service</TabsTrigger>
              <TabsTrigger value="pricing"><DollarSign className="w-3.5 h-3.5 mr-1.5 inline" />Pricing</TabsTrigger>
              <TabsTrigger value="rentals"><ClipboardList className="w-3.5 h-3.5 mr-1.5 inline" />Rentals</TabsTrigger>
              <TabsTrigger value="financials"><TrendingUp className="w-3.5 h-3.5 mr-1.5 inline" />Financials</TabsTrigger>
            </TabsList>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm"><Edit className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
          </div>

          {/* ── DETAILS ── */}
          <TabsContent value="details" className="mt-0">
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Registration", value: <span className="font-bold text-blue-600">{vehicle.reg_number}</span> },
                  { label: "Brand", value: vehicle.brand },
                  { label: "Model", value: vehicle.model },
                  { label: "Year", value: vehicle.year?.toString() ?? "—" },
                  { label: "Color", value: vehicle.color ?? "—" },
                  { label: "Type", value: <StatusBadge status={vehicle.type?.toLowerCase() || "unknown"} /> },
                  { label: "Source", value: <StatusBadge status={vehicle.source?.toLowerCase() || "unknown"} /> },
                  { label: "Supplier", value: vehicle.supplier?.name ?? "—" },
                  { label: "Fuel Type", value: vehicle.fuel_type ?? "—" },
                  { label: "Transmission", value: vehicle.transmission ?? "—" },
                  { label: "Status", value: <StatusBadge status={vehicle.status} /> },
                  { label: "Current KM", value: (vehicle.current_km || 0).toLocaleString() + " km" },
                  { label: "Next Service KM", value: (vehicle.next_service_km || 0).toLocaleString() + " km" },
                  { label: "Daily Rate", value: formatCurrency(vehicle.daily_rate) },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                    <div className="text-sm font-medium text-gray-900">{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Supplier Bank Details */}
              {vehicle.supplier && (vehicle.supplier.bank || vehicle.supplier.account_number || vehicle.supplier.branch) && (
                <div className="border-t border-gray-100 pt-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Supplier Bank Details</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-blue-50 rounded-lg p-4 border border-blue-100">
                    {[
                      { label: "Bank", value: vehicle.supplier.bank ?? "—" },
                      { label: "Account Number", value: vehicle.supplier.account_number ?? "—" },
                      { label: "Branch", value: vehicle.supplier.branch ?? "—" },
                    ].map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-gray-500 mb-0.5">{f.label}</p>
                        <p className="text-sm font-medium text-gray-900">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Schedule — supplier vehicles only */}
              {vehicle.source === "Supplier" && vehicle.payment_days && (
                <div className="border-t border-gray-100 pt-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Payment Schedule</p>
                  <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Monthly Cost</span>
                      <span className="text-sm font-bold text-gray-900">{vehicle.monthly_cost ? formatCurrency(vehicle.monthly_cost) : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Frequency</span>
                      <span className="text-sm font-medium text-gray-700">{vehicle.payment_frequency === '15_days' ? '15 Days (2x/month)' : '1 Month'}</span>
                    </div>
                    <div className="border-t border-amber-200 pt-3">
                      <p className="text-xs text-gray-500 mb-2">Payment Days</p>
                      <div className="space-y-1.5">
                        {(vehicle.payment_days || "").split(",").map((day, i) => (
                          <div key={i} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-100">
                            <span className="text-sm font-medium text-gray-800">📋 Day {day.trim()} of every month</span>
                            <span className="text-sm font-semibold text-amber-700">
                              {vehicle.monthly_cost
                                ? formatCurrency(vehicle.payment_frequency === '15_days' ? vehicle.monthly_cost / 2 : vehicle.monthly_cost)
                                : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Documents */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Vehicle Documents</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Registration Document */}
                  {vehicle.registration_document_url ? (
                    <div className="flex items-center gap-3 bg-green-50 rounded-lg border border-green-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Registration Document</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.registration_document_url)}</p>
                      </div>
                      <a href={vehicle.registration_document_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                      <p className="text-sm text-gray-500">No registration document</p>
                    </div>
                  )}

                  {/* Revenue License */}
                  {vehicle.revenue_license_url ? (
                    <div className="flex items-center gap-3 bg-green-50 rounded-lg border border-green-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Revenue License</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.revenue_license_url)}</p>
                      </div>
                      <a href={vehicle.revenue_license_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                      <p className="text-sm text-gray-500">No revenue license</p>
                    </div>
                  )}

                  {/* Eco Test */}
                  {vehicle.eco_test_url ? (
                    <div className="flex items-center gap-3 bg-green-50 rounded-lg border border-green-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Eco Test</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.eco_test_url)}</p>
                      </div>
                      <a href={vehicle.eco_test_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                      <p className="text-sm text-gray-500">No eco test document</p>
                    </div>
                  )}

                  {/* Insurance */}
                  {vehicle.insurance_url ? (
                    <div className="flex items-center gap-3 bg-green-50 rounded-lg border border-green-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Insurance</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.insurance_url)}</p>
                      </div>
                      <a href={vehicle.insurance_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                      <p className="text-sm text-gray-500">No insurance document</p>
                    </div>
                  )}

                  {/* Service Tag */}
                  {vehicle.service_tag_url ? (
                    <div className="flex items-center gap-3 bg-green-50 rounded-lg border border-green-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Service Tag</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.service_tag_url)}</p>
                      </div>
                      <a href={vehicle.service_tag_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                      <p className="text-sm text-gray-500">No service tag document</p>
                    </div>
                  )}
                </div>
              </div>

              {vehicle.notes && (
                <div className="border-t border-gray-100 pt-6">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{vehicle.notes}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── IMAGES ── */}
          <TabsContent value="images" className="mt-0">
            <div className="p-5 space-y-6">
              {/* Vehicle Documents */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Vehicle Documents</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Registration Document */}
                  {vehicle.registration_document_url ? (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Registration Document</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.registration_document_url)}</p>
                      </div>
                      <a href={vehicle.registration_document_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                      <p className="text-sm text-gray-500 mb-2">No registration document</p>
                      <button onClick={() => { setError(null); setEditing(true); }} className="btn-secondary text-xs">Add Document</button>
                    </div>
                  )}

                  {/* Revenue License */}
                  {vehicle.revenue_license_url ? (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Revenue License</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.revenue_license_url)}</p>
                      </div>
                      <a href={vehicle.revenue_license_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                      <p className="text-sm text-gray-500 mb-2">No revenue license</p>
                      <button onClick={() => { setError(null); setEditing(true); }} className="btn-secondary text-xs">Add Document</button>
                    </div>
                  )}

                  {/* Eco Test */}
                  {vehicle.eco_test_url ? (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Eco Test</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.eco_test_url)}</p>
                      </div>
                      <a href={vehicle.eco_test_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                      <p className="text-sm text-gray-500 mb-2">No eco test document</p>
                      <button onClick={() => { setError(null); setEditing(true); }} className="btn-secondary text-xs">Add Document</button>
                    </div>
                  )}

                  {/* Insurance */}
                  {vehicle.insurance_url ? (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Insurance</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.insurance_url)}</p>
                      </div>
                      <a href={vehicle.insurance_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                      <p className="text-sm text-gray-500 mb-2">No insurance document</p>
                      <button onClick={() => { setError(null); setEditing(true); }} className="btn-secondary text-xs">Add Document</button>
                    </div>
                  )}

                  {/* Service Tag */}
                  {vehicle.service_tag_url ? (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Service Tag</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getFilename(vehicle.service_tag_url)}</p>
                      </div>
                      <a href={vehicle.service_tag_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View Document</a>
                    </div>
                  ) : (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                      <p className="text-sm text-gray-500 mb-2">No service tag document</p>
                      <button onClick={() => { setError(null); setEditing(true); }} className="btn-secondary text-xs">Add Document</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Photos */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Vehicle Photos</p>
                {localPhotos.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-gray-300">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <p className="text-sm text-gray-400">No photos yet.</p>
                    <button onClick={() => { setError(null); setEditing(true); }} className="btn-secondary text-xs mt-3">
                      <Edit className="w-3.5 h-3.5" /> Edit to Add Photos
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {localPhotos.map((p: any) => (
                        <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block group">
                          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                            <img src={p.url} alt="Vehicle" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded transition-opacity">View Full</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-center">Click <strong>Edit</strong> to add or remove photos.</p>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── INSURANCE & SERVICE ── */}
          <TabsContent value="insurance" className="mt-0">
            <div className="p-5 space-y-6">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Documents & Expiry Dates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Insurance Expiry", value: vehicle.insurance_expiry, icon: "🛡️" },
                    { label: "Revenue License Expiry", value: vehicle.revenue_license_expiry, icon: "📋" },
                    { label: "Eco Test Expiry", value: vehicle.eco_test_expiry, icon: "🍃" },
                  ].map(item => {
                    const isExpired = item.value && new Date(item.value) < new Date();
                    const isSoon = item.value && !isExpired && (new Date(item.value).getTime() - Date.now()) < 30 * 86400000;
                    return (
                      <div key={item.label} className={`flex items-start gap-3 p-4 rounded-xl border ${
                        isExpired ? "border-red-200 bg-red-50" : isSoon ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"
                      }`}>
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                          <p className={`text-sm font-semibold ${isExpired ? "text-red-600" : isSoon ? "text-amber-700" : "text-gray-900"}`}>
                            {formatDate(item.value)}
                          </p>
                          {isExpired && <p className="text-[10px] text-red-500 font-semibold mt-0.5">EXPIRED</p>}
                          {isSoon && !isExpired && <p className="text-[10px] text-amber-600 font-semibold mt-0.5">EXPIRING SOON</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Service History</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Last Service Date", value: formatDate(vehicle.last_service_date) },
                    { label: "Last Service KM", value: vehicle.last_service_km ? vehicle.last_service_km.toLocaleString() + " km" : "—" },
                    { label: "Next Service Date", value: formatDate(vehicle.next_service_date) },
                    { label: "Next Service KM", value: vehicle.next_service_km ? vehicle.next_service_km.toLocaleString() + " km" : "—" },
                  ].map(f => (
                    <div key={f.label} className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-0.5">{f.label}</p>
                      <p className="text-sm font-semibold text-gray-900">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── PRICING ── */}
          <TabsContent value="pricing" className="mt-0">
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Rate Tiers</p>
                {(!vehicle.rate_tiers || vehicle.rate_tiers.length === 0) ? (
                  <div className="flex flex-col items-center py-8 text-gray-300">
                    <DollarSign className="w-10 h-10 mb-2" />
                    <p className="text-sm text-gray-400">No rate tiers configured. Click Edit to add pricing tiers.</p>
                    <button onClick={() => setEditing(true)} className="btn-secondary text-xs mt-3">
                      <Edit className="w-3.5 h-3.5" /> Add Rate Tiers
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicle.rate_tiers?.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Duration</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {tier.days_from} — {tier.days_to ?? "∞"} days
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-0.5">Rate per day</p>
                          <p className="text-lg font-bold text-blue-600">{formatCurrency(tier.rate_per_day)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40">
                <p className="text-xs text-blue-500 font-semibold mb-1">Base Daily Rate (Fallback)</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(vehicle.daily_rate)}<span className="text-sm font-normal text-gray-400"> / day</span></p>
              </div>
            </div>
          </TabsContent>

          {/* ── RENTALS ── */}
          <TabsContent value="rentals" className="mt-0">
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Rental History ({rentals.length} total)
              </p>
              {rentals.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-300">
                  <ClipboardList className="w-10 h-10 mb-2" />
                  <p className="text-sm text-gray-400">No rentals yet for this vehicle.</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rental #</th>
                        <th>Customer</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rentals.map(r => (
                        <tr key={r.id} className={r.status === "active" ? "bg-blue-50/50" : ""}>
                          <td>
                            <a href={`/rentals/${r.id}`} className="text-blue-600 hover:underline font-medium">
                              {r.rental_number}
                            </a>
                          </td>
                          <td>{(r.customer as any)?.name ?? "—"}</td>
                          <td>{formatDate(r.start_date)}</td>
                          <td>{formatDate(r.end_date)}</td>
                          <td className="font-medium">{formatCurrency(r.total_amount ?? 0)}</td>
                          <td><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── FINANCIALS ── */}
          <TabsContent value="financials" className="mt-0">
            <FinancialsTab rentals={rentals} totalRevenue={totalRevenue} activeRentals={activeRentals} completedRentals={completedRentals} />
          </TabsContent>
        </div>
      </Tabs>

      <PasswordConfirmModal open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete Vehicle" description="This will permanently deactivate this vehicle." onConfirm={performDelete} />

      {/* ── EDIT MODAL ── */}
      <EditModal open={editing} title="Edit Vehicle" onClose={() => { setEditing(false); setEditBrand(vehicle.brand); setEditModel(vehicle.model); setError(null); }} maxWidth="max-w-4xl">
        <form onSubmit={handleEditSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="form-label text-sm">Brand <span className="text-red-500 ml-0.5">*</span></label>
              <select name="brand" value={editBrand} onChange={handleEditBrandChange} className="form-select text-sm">
                {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-sm">Model <span className="text-red-500 ml-0.5">*</span></label>
              <select name="model" value={editModel} onChange={e => setEditModel(e.target.value)} className="form-select text-sm">
                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-sm">Year</label>
              <select name="year" defaultValue={vehicle.year?.toString() ?? ""} className="form-select text-sm">
                <option value="">— Select —</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-sm">Color</label>
              <select name="color" defaultValue={vehicle.color ?? ""} className="form-select text-sm">
                <option value="">— Select —</option>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {[
              { name: "daily_rate", label: "Daily Rate (LKR)", defaultValue: vehicle.daily_rate.toString(), type: "number", required: true },
              { name: "current_km", label: "Current KM", defaultValue: (vehicle.current_km || "").toString(), type: "number" },
              { name: "next_service_km", label: "Next Service KM", defaultValue: (vehicle.next_service_km || "").toString(), type: "number" },
            ].map(f => (
              <div key={f.name}>
                <label className="form-label text-sm">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input name={f.name} type={f.type ?? "text"} defaultValue={f.defaultValue} required={f.required} className="form-input text-sm" />
              </div>
            ))}
            <div>
              <label className="form-label text-sm">Type</label>
              <select name="type" defaultValue={vehicle.type} className="form-select text-sm">
                {["Sedan","Hatchback","SUV","Van","Pickup","Bus","Other"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-sm">Status</label>
              <select name="status" defaultValue={vehicle.status} className="form-select text-sm">
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="booked">Booked</option>
                <option value="in_garage">In Garage</option>
              </select>
            </div>
            <div>
              <label className="form-label text-sm">Source</label>
              <select name="source" value={editSource} onChange={e => setEditSource(e.target.value as "Company" | "Supplier")} className="form-select text-sm">
                <option value="Company">Company</option>
                <option value="Supplier">Supplier</option>
              </select>
            </div>
            <div>
              <label className="form-label text-sm">Supplier</label>
              <select name="supplier_id" defaultValue={vehicle.supplier_id ?? ""} className="form-select text-sm">
                <option value="">— No Supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {/* Supplier Payment Fields */}
            {editSource === "Supplier" && (
              <>
                <div>
                  <label className="form-label text-sm">Monthly Cost (Rs.)</label>
                  <input name="monthly_cost" type="number" min="0" step="0.01" defaultValue={vehicle.monthly_cost ?? ""} className="form-input text-sm" />
                </div>
                <div>
                  <label className="form-label text-sm">Payment Frequency</label>
                  <select
                    name="payment_frequency"
                    className="form-select text-sm"
                    value={editPayFreq}
                    onChange={e => handleEditPayFreqChange(e.target.value)}
                  >
                    <option value="1_month">1 Month</option>
                    <option value="15_days">15 Days</option>
                  </select>
                </div>
                <div>
                  <label className="form-label text-sm">Payment Day(s) of Month</label>
                  <input
                    name="payment_days"
                    type="text"
                    value={editPayDays}
                    onChange={e => setEditPayDays(e.target.value)}
                    placeholder="e.g. 15,30"
                    className="form-input text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-filled when frequency changes. You can also edit manually.</p>
                </div>
              </>
            )}
            <div>
              <label className="form-label text-sm">Next Service Date</label>
              <input name="next_service_date" type="date" defaultValue={vehicle.next_service_date ?? ""} className="form-input text-sm" />
            </div>
            <div>
              <label className="form-label text-sm">Last Service Date</label>
              <input name="last_service_date" type="date" defaultValue={vehicle.last_service_date ?? ""} className="form-input text-sm" />
            </div>
            <div>
              <label className="form-label text-sm">Insurance Expiry</label>
              <input name="insurance_expiry" type="date" defaultValue={vehicle.insurance_expiry ?? ""} className="form-input text-sm" />
            </div>
            <div>
              <label className="form-label text-sm">Revenue License Expiry</label>
              <input name="revenue_license_expiry" type="date" defaultValue={vehicle.revenue_license_expiry ?? ""} className="form-input text-sm" />
            </div>
            <div>
              <label className="form-label text-sm">Eco Test Expiry</label>
              <input name="eco_test_expiry" type="date" defaultValue={vehicle.eco_test_expiry ?? ""} className="form-input text-sm" />
            </div>
            <div>
              <label className="form-label text-sm">Rental Start Date</label>
              <input name="rental_start_date" type="date" defaultValue={vehicle.rental_start_date ?? ""} className="form-input text-sm" />
            </div>
            <div>
              <label className="form-label text-sm">Renew Date</label>
              <input name="renew_date" type="date" defaultValue={vehicle.renew_date ?? ""} className="form-input text-sm" />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label text-sm">Notes</label>
            <textarea name="notes" defaultValue={vehicle.notes ?? ""} rows={2} className="form-input text-sm resize-none" />
          </div>

          {/* Rate Tiers */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <label className="form-label mb-0">Rate Tiers</label>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Fixed 4 tiers</span>
            </div>
            <div className="space-y-2">
              {rateTiers.map((tier, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end bg-gray-50 px-4 py-3 rounded-lg">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Days From</label>
                    <input type="number" value={tier.days_from} onChange={e => setRateTiers(prev => prev.map((t, j) => j === i ? {...t, days_from: +e.target.value} : t))} className="form-input text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Days To {i === 3 && <span className="text-gray-400">(blank = open)</span>}</label>
                    <input type="number" value={tier.days_to ?? ""} placeholder={i === 3 ? "Open-ended" : ""} onChange={e => setRateTiers(prev => prev.map((t, j) => j === i ? {...t, days_to: e.target.value ? +e.target.value : undefined} : t))} className="form-input text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Rate/Day (LKR)</label>
                    <input type="number" value={tier.rate_per_day} onChange={e => setRateTiers(prev => prev.map((t, j) => j === i ? {...t, rate_per_day: +e.target.value} : t))} className="form-input text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents inside edit modal */}
          <div className="mb-6 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Vehicle Documents</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploader
                label="Registration Document (JPG/PDF, max 5MB)"
                fieldName="registration_document"
                bucket="vehicle-documents"
                folder={`${vehicle.reg_number}/registration`}
                accept=".jpg,.jpeg,.pdf"
                multiple={false}
                maxFiles={1}
                initialFiles={vehicle.registration_document_url ? [{ url: vehicle.registration_document_url, path: vehicle.registration_document_path || "" }] : []}
              />
              <FileUploader
                label="Revenue License (JPG/PDF, max 5MB)"
                fieldName="revenue_license"
                bucket="vehicle-documents"
                folder={`${vehicle.reg_number}/revenue_license`}
                accept=".jpg,.jpeg,.pdf"
                multiple={false}
                maxFiles={1}
                initialFiles={vehicle.revenue_license_url ? [{ url: vehicle.revenue_license_url, path: vehicle.revenue_license_path || "" }] : []}
              />
              <FileUploader
                label="Eco Test (JPG/PDF, max 5MB)"
                fieldName="eco_test"
                bucket="vehicle-documents"
                folder={`${vehicle.reg_number}/eco_test`}
                accept=".jpg,.jpeg,.pdf"
                multiple={false}
                maxFiles={1}
                initialFiles={vehicle.eco_test_url ? [{ url: vehicle.eco_test_url, path: vehicle.eco_test_path || "" }] : []}
              />
              <FileUploader
                label="Insurance (JPG/PDF, max 5MB)"
                fieldName="insurance"
                bucket="vehicle-documents"
                folder={`${vehicle.reg_number}/insurance`}
                accept=".jpg,.jpeg,.pdf"
                multiple={false}
                maxFiles={1}
                initialFiles={vehicle.insurance_url ? [{ url: vehicle.insurance_url, path: vehicle.insurance_path || "" }] : []}
              />
              <FileUploader
                label="Service Tag (JPG/PDF, max 5MB)"
                fieldName="service_tag"
                bucket="vehicle-documents"
                folder={`${vehicle.reg_number}/service_tag`}
                accept=".jpg,.jpeg,.pdf"
                multiple={false}
                maxFiles={1}
                initialFiles={vehicle.service_tag_url ? [{ url: vehicle.service_tag_url, path: vehicle.service_tag_path || "" }] : []}
              />
            </div>
          </div>

          {/* Photos inside edit modal */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Vehicle Photos</p>
            <FileUploader
              label="(JPG/PNG, max 5MB per photo, up to 6)"
              bucket="vehicle-photos"
              folder={vehicle.reg_number}
              accept="image/*"
              multiple={true}
              maxFiles={6}
              initialFiles={localPhotos.map(p => ({ id: p.id, url: p.url, path: p.storage_path, isNew: false }))}
              customUploadAction={async (file) => {
                const res = await uploadVehiclePhoto(vehicle.id, file, localPhotos.length === 0);
                if (res.error) return { error: res.error };
                // Update local state immediately so Images tab reflects the new photo
                setLocalPhotos(prev => [...prev, { id: res.id, url: res.url, storage_path: res.path }]);
                return { url: res.url, path: res.path, id: res.id };
              }}
              customDeleteAction={async (path, url, fileId) => {
                if (!fileId) return { error: "Missing file ID" };
                const res = await deleteVehiclePhoto(fileId, path, vehicle.id);
                if (res && "error" in res) return { error: res.error as string };
                // Remove from local state immediately so Images tab reflects the deletion
                setLocalPhotos(prev => prev.filter(p => p.id !== fileId));
                return {};
              }}
            />
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => { setEditing(false); setEditBrand(vehicle.brand); setEditModel(vehicle.model); setError(null); }} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm">{isPending ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
        <PasswordConfirmModal open={confirmEdit} onOpenChange={setConfirmEdit} title="Confirm Edit" description="Enter your password to save changes." onConfirm={performEdit} />
      </EditModal>
    </div>
  );
}