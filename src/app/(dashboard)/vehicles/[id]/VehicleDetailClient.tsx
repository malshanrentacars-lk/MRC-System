"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Vehicle, Supplier, Rental, Company } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { updateVehicle, deleteVehicle, uploadVehiclePhoto, deleteVehiclePhoto, getVehicleUpdates, addVehicleUpdate } from "@/app/actions/vehicles";
import PasswordConfirmModal from "@/components/shared/PasswordConfirmModal";
import StatusBadge from "@/components/shared/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Edit, Trash2, Upload, X, Plus, Minus, Camera, Pencil, Check,
  Car, Shield, DollarSign, TrendingUp, Image as ImageIcon, ClipboardList, ChevronDown, Package, ExternalLink, History
} from "lucide-react";
import { BRANDS, COLORS, YEARS, getModels, FUEL_TYPES, TRANSMISSION_TYPES, calcTiersFromMonthly, TIER_LABELS } from "@/lib/vehicleData";
import FileUploader, { UploadedFile } from "@/components/shared/FileUploader";
import DocumentViewer from "@/components/shared/DocumentViewer";

interface Props {
  vehicle: Vehicle;
  suppliers: Supplier[];
  companies: Company[];
  rentals: Rental[];
}

function getFilename(url: string): string {
  return url.split('/').pop()?.split('?')[0] || 'Document';
}

// Default 4 rate tiers
const DEFAULT_TIERS = [
  { id: "", vehicle_id: "", days_from: 1, days_to: 7, rate_per_day: 0 },
  { id: "", vehicle_id: "", days_from: 8, days_to: 14, rate_per_day: 0 },
  { id: "", vehicle_id: "", days_from: 15, days_to: 21, rate_per_day: 0 },
  { id: "", vehicle_id: "", days_from: 22, days_to: 30, rate_per_day: 0 },
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

// ─── Vehicle Updates Tab ──────────────────────────────────────────────────
const UPDATE_TYPES = [
  { value: 'general', label: 'General', icon: '📋', color: 'bg-gray-500' },
  { value: 'service', label: 'Service', icon: '🔧', color: 'bg-blue-500' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️', color: 'bg-green-500' },
  { value: 'revenue_license', label: 'Revenue License', icon: '📄', color: 'bg-amber-500' },
  { value: 'eco_test', label: 'Eco Test', icon: '🌿', color: 'bg-emerald-500' },
] as const;

const DIFF_FIELD_LABELS: Record<string, string> = {
  current_km: 'Odometer',
  status: 'Status',
  last_service_date: 'Last Service Date',
  last_service_km: 'Last Service KM',
  next_service_date: 'Next Service Date',
  next_service_km: 'Next Service KM',
  insurance_expiry: 'Insurance Expiry',
  revenue_license_expiry: 'Revenue License Expiry',
  eco_test_expiry: 'Eco Test Expiry',
  insurance_url: 'Insurance Doc',
  revenue_license_url: 'Revenue License Doc',
  eco_test_url: 'Eco Test Doc',
};

function formatDiffValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (key.endsWith('_url')) return value as string;
  if (key === 'current_km' || key === 'next_service_km') return `${(value as number).toLocaleString()} km`;
  if (key.endsWith('_date') || key === 'insurance_expiry' || key === 'revenue_license_expiry' || key === 'eco_test_expiry') {
    return formatDate(value as string);
  }
  return String(value);
}

function VehicleUpdatesTab({ vehicleId, currentKm, vehicleStatus }: { vehicleId: string; currentKm: number; vehicleStatus: string }) {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [updateType, setUpdateType] = useState('general');
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [pendingUpdateFd, setPendingUpdateFd] = useState<FormData | null>(null);
  const today = new Date().toISOString().split('T')[0];

  // Service auto-calc
  const [serviceInterval, setServiceInterval] = useState('5000');
  const [serviceDate, setServiceDate] = useState(today);
  const [serviceKm, setServiceKm] = useState('');
  const autoNextKm = serviceKm && serviceInterval ? parseInt(serviceKm) + parseInt(serviceInterval) : null;
  const autoNextDate = (() => {
    if (!serviceDate || !serviceInterval) return null;
    const d = new Date(serviceDate + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + Math.round(parseInt(serviceInterval) / 100));
    return d.toISOString().split('T')[0];
  })();

  useEffect(() => {
    getVehicleUpdates(vehicleId).then(data => {
      setUpdates(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [vehicleId]);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('update_type', updateType);
    setPendingUpdateFd(fd);
    setError(null);
    setConfirmUpdate(true);
  }

  async function performUpdate() {
    if (!pendingUpdateFd) return;
    startTransition(async () => {
      const result = await addVehicleUpdate(vehicleId, pendingUpdateFd);
      if ("error" in result && result.error) { setError(result.error); setConfirmUpdate(false); return; }
      setConfirmUpdate(false);
      setPendingUpdateFd(null);
      setUpdates(prev => [result.data, ...prev]);
    });
  }

  const typeInfo = UPDATE_TYPES.find(t => t.value === updateType);
  const readonlyStatuses = ['rented', 'booked'];
  const isStatusLocked = readonlyStatuses.includes(vehicleStatus);

  return (
    <>
    <div className="p-5 space-y-6">
      {/* Add Update Form */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Log an Update</p>
        <form onSubmit={handleAdd} className="space-y-3">
          {/* Update Type */}
          <div className="flex flex-wrap gap-2">
            {UPDATE_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setUpdateType(t.value)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  updateType === t.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* Common fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-[10px]">Date <span className="text-red-500">*</span></label>
              <input name="update_date" type="date" required defaultValue={today} max={today} onChange={e => setServiceDate(e.target.value)} className="form-input text-sm" />
            </div>
            <div>
              <label className="form-label text-[10px]">Current KM <span className="text-red-500">*</span></label>
              <input name="current_km" type="number" required defaultValue={currentKm || ""} min={currentKm || 0} placeholder={`Min: ${(currentKm || 0).toLocaleString()} km`} onChange={e => setServiceKm(e.target.value)} className="form-input text-sm" />
            </div>
          </div>

          {/* Conditional: Service */}
          {updateType === 'service' && (
            <>
              <div className="pt-1 border-t border-blue-200">
                <label className="form-label text-[10px]">Description</label>
                <input name="description" placeholder="e.g. Full service completed, oil change" className="form-input text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-[10px]">Service Interval</label>
                  <select className="form-select text-sm" value={serviceInterval} onChange={e => setServiceInterval(e.target.value)}>
                    <option value="3000">3,000 KM</option>
                    <option value="5000">5,000 KM</option>
                    <option value="7000">7,000 KM</option>
                    <option value="10000">10,000 KM</option>
                  </select>
                  <input type="hidden" name="service_interval" value={serviceInterval} />
                </div>
                <div>
                  <label className="form-label text-[10px]">Next Service KM</label>
                  <input type="text" readOnly value={autoNextKm != null ? autoNextKm.toLocaleString() : '—'} className="form-input text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="form-label text-[10px]">Next Service Date</label>
                <input type="text" readOnly value={autoNextDate || '—'} className="form-input text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
            </>
          )}

          {/* Conditional: Insurance / Revenue License / Eco Test */}
          {(updateType === 'insurance' || updateType === 'revenue_license' || updateType === 'eco_test') && (
            <div className="space-y-3 pt-1 border-t border-blue-200">
              <div>
                <label className="form-label text-[10px]">New Expiry Date <span className="text-red-500">*</span></label>
                <input name="expiry_date" type="date" required className="form-input text-sm w-48" />
              </div>
              <div>
                <label className="form-label text-[10px]">Upload New Document <span className="text-red-500">*</span></label>
                <FileUploader
                  label="JPG/PDF, max 5MB"
                  fieldName="doc"
                  bucket="vehicle-documents"
                  folder={`vehicles/${vehicleId}/${updateType}`}
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple={false}
                  maxFiles={1}
                />
              </div>
            </div>
          )}

          {/* Conditional: General */}
          {updateType === 'general' && (
            <div className="space-y-3 pt-1 border-t border-blue-200">
              <div>
                <label className="form-label text-[10px]">Note</label>
                <input name="description" placeholder="e.g. Vehicle cleaned, new floor mats" className="form-input text-sm" />
              </div>
              <div>
                <label className="form-label text-[10px]">Change Status</label>
                {isStatusLocked ? (
                  <input type="text" readOnly value={vehicleStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} className="form-input text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                ) : (
                  <select name="vehicle_status" className="form-select text-sm" defaultValue={vehicleStatus}>
                    <option value="available">Available</option>
                    <option value="in_garage">In Garage</option>
                    <option value="owner_returned">Owner Returned</option>
                  </select>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={isPending} className="btn-primary text-sm">
              {isPending ? "Saving..." : "Add Update"}
            </button>
          </div>
        </form>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      {/* Updates Log */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
      ) : updates.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-300">
          <History className="w-10 h-10 mb-2" />
          <p className="text-sm text-gray-400">No updates logged yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">{updates.length} update{updates.length !== 1 ? 's' : ''}</p>
          {updates.map((u: any, i: number) => {
            const ut = UPDATE_TYPES.find(t => t.value === u.update_type) || UPDATE_TYPES[0];
            return (
              <div key={u.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${ut.color} mt-1.5 flex-shrink-0`} title={ut.label} />
                  {i < updates.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-white border border-gray-200">{ut.icon} {ut.label}</span>
                      <p className="text-sm font-medium text-gray-900">{u.description}</p>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(u.update_date)}</span>
                  </div>

                  {/* Diff fields */}
                  {u.old_data && u.new_data && (
                    <div className="mt-2 space-y-0.5">
                      {Object.keys(u.old_data).map((key: string) => {
                        const oldVal = formatDiffValue(key, u.old_data[key]);
                        const newVal = formatDiffValue(key, u.new_data[key]);
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 font-medium min-w-[120px]">{DIFF_FIELD_LABELS[key] || key}:</span>
                            <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">{oldVal}</span>
                            <span className="text-gray-300">→</span>
                            <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">{newVal}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                    {u.current_km != null && !u.old_data && <span>Odometer: {u.current_km.toLocaleString()} km</span>}
                    {u.created_by_user && <span>by {u.created_by_user.full_name}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    <PasswordConfirmModal open={confirmUpdate} onOpenChange={setConfirmUpdate} title="Log Update" description="Please verify your password to save this update." onConfirm={performUpdate} />
    </>
  );
}

export default function VehicleDetailClient({ vehicle: initial, suppliers, companies, rentals }: Props) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState(initial);
  // Separate local photos state — updates immediately on upload/delete
  // so the Images tab reflects changes without waiting for a server round-trip
  const [localPhotos, setLocalPhotos] = useState<any[]>(initial.photos ?? []);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [editFormData, setEditFormData] = useState<FormData | null>(null);
  const [docViewer, setDocViewer] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  
  // Rate tiers: if existing tiers exist use them (up to 4), else show 4 defaults
  const initTiers = vehicle.rate_tiers && vehicle.rate_tiers.length > 0
    ? vehicle.rate_tiers.slice(0, 4)
    : DEFAULT_TIERS.map(t => ({ ...t, vehicle_id: vehicle.id }));
  const [rateTiers, setRateTiers] = useState(initTiers);
  const [editMonthlyRate, setEditMonthlyRate] = useState<number | string>(vehicle.daily_rate * 30 || "");

  useEffect(() => {
    setVehicle(initial);
    setLocalPhotos(initial.photos ?? []);
  }, [initial]);

  function handleMonthlyRateChange(val: string) {
    setEditMonthlyRate(val);
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) setRateTiers(calcTiersFromMonthly(num) as any);
  }
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Controlled states for cascading Brand -> Model
  const [editBrand, setEditBrand] = useState(vehicle.brand || "Toyota");
  const [editModel, setEditModel] = useState(vehicle.model || "Corolla");
  const availableModels = getModels(editBrand);
  const [editSource, setEditSource] = useState<"Company" | "Supplier">(
    (vehicle.source as "Company" | "Supplier") || "Company"
  );
  const [editFuelType, setEditFuelType] = useState(vehicle.fuel_type || "Petrol");
  const [editPayFreq, setEditPayFreq] = useState(vehicle.payment_frequency || "1_month");
  const payDayValues = (vehicle.payment_days || "").split(",");
  const [editPayDay1, setEditPayDay1] = useState(payDayValues[0] ? parseInt(payDayValues[0]) : 30);
  const [editPayDay2, setEditPayDay2] = useState(payDayValues[1] ? parseInt(payDayValues[1]) : 15);
  const [editPayDaysLocked, setEditPayDaysLocked] = useState(true);
  const [editAgreementPeriod, setEditAgreementPeriod] = useState(vehicle.agreement_period || "");
  const [editAgreementStartDate, setEditAgreementStartDate] = useState(vehicle.agreement_start_date || "");
  const [editRenewDate, setEditRenewDate] = useState(vehicle.renew_date || "");

  function calcEditRenewDate(startDate: string, period: string) {
    if (!startDate || !period) return "";
    const date = new Date(startDate + "T00:00:00");
    if (isNaN(date.getTime())) return "";
    date.setMonth(date.getMonth() + parseInt(period));
    return date.toISOString().split("T")[0];
  }

  function handleEditAgreementStartDateChange(date: string) {
    setEditAgreementStartDate(date);
    setEditRenewDate(calcEditRenewDate(date, editAgreementPeriod));
  }

  function handleEditAgreementPeriodChange(period: string) {
    setEditAgreementPeriod(period);
    setEditRenewDate(calcEditRenewDate(editAgreementStartDate, period));
  }

  function calcPayDays(freq: string): string {
    const today = new Date();
    const d1 = new Date(today); d1.setDate(today.getDate() + 15);
    const d2 = new Date(today); d2.setDate(today.getDate() + 30);
    if (freq === "15_days") return `${d1.getDate()},${d2.getDate()}`;
    return `${d2.getDate()}`;
  }

  function handleEditPayFreqChange(freq: string) {
    setEditPayFreq(freq);
    if (editPayDaysLocked) {
      const days = calcPayDays(freq).split(",");
      setEditPayDay1(parseInt(days[0]));
      if (days[1]) setEditPayDay2(parseInt(days[1]));
    }
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
    fd.set("brand", editBrand);
    fd.set("model", editModel);
    fd.set("daily_rate", rateTiers.length > 0 ? rateTiers[0].rate_per_day.toString() : "0");
    fd.set("rate_tiers", JSON.stringify(rateTiers.map(t => ({ days_from: t.days_from, days_to: t.days_to, rate_per_day: t.rate_per_day }))));
    setEditFormData(fd);
    setError(null);
    setConfirmEdit(true);
  }

  async function performEdit() {
    if (!editFormData) return;
    startTransition(async () => {
      const result = await updateVehicle(vehicle.id, editFormData);
      if (result.error) { setError(result.error); setConfirmEdit(false); return; }
      setConfirmEdit(false);
      setEditing(false);
      setEditFormData(null);
      router.push(`/vehicles/${vehicle.id}`);
      router.refresh();
    });
  }

  function performDelete() {
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
      {/* Edit form — visible when editing */}
      {editing && (
        <div className="section-card mb-4">
          <div className="px-5 py-3 border-b border-gray-100 bg-blue-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Edit Vehicle</h2>
          </div>
          <form id="vehicle-edit-form" onSubmit={handleEditSubmit} className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="form-label text-sm">Brand <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="brand" value={editBrand} onChange={handleEditBrandChange} className="form-select text-sm">
                    {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-sm">Nickname</label>
                  <input name="nickname" defaultValue={vehicle.nickname ?? ""} placeholder="e.g. Blue Lightning" className="form-input text-sm" />
                </div>
                <div>
                  <label className="form-label text-sm">Model <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="model" value={editModel} onChange={e => setEditModel(e.target.value)} className="form-select text-sm">
                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-sm">Year <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="year" required defaultValue={vehicle.year?.toString() ?? ""} className="form-select text-sm">
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
                <div>
                  <label className="form-label text-sm">Type <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="type" required defaultValue={vehicle.type} className="form-select text-sm">
                    {["Sedan","Hatchback","SUV","Van","Pickup","Bus","Other"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-sm">Fuel Type <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="fuel_type" required value={editFuelType} onChange={e => setEditFuelType(e.target.value)} className="form-select text-sm">
                    <option value="">— Select —</option>
                    {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-sm">Transmission <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="transmission" required defaultValue={vehicle.transmission ?? ""} className="form-select text-sm">
                    <option value="">— Select —</option>
                    {TRANSMISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-sm">Source <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="source" required value={editSource} onChange={e => setEditSource(e.target.value as "Company" | "Supplier")} className="form-select text-sm">
                    <option value="Company">Company</option>
                    <option value="Supplier">Supplier</option>
                  </select>
                </div>
                <div>
                  <label className="form-label text-sm">Company <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="company_id" required defaultValue={vehicle.company_id ?? vehicle.company?.id ?? ""} className="form-select text-sm">
                    <option value="">— Select Company —</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {editSource === "Supplier" && (
                <div>
                  <label className="form-label text-sm">Supplier <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="supplier_id" required defaultValue={vehicle.supplier_id ?? ""} className="form-select text-sm">
                    <option value="">— No Supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                )}
              </div>
              {editSource === "Supplier" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="form-label text-sm">Supplier Payment (Rs.) <span className="text-red-500 ml-0.5">*</span></label>
                    <input name="monthly_cost" type="number" min="0" step="0.01" required defaultValue={vehicle.monthly_cost ?? ""} className="form-input text-sm" />
                  </div>
                  <div>
                    <label className="form-label text-sm">Payment Frequency <span className="text-red-500 ml-0.5">*</span></label>
                    <select name="payment_frequency" required className="form-select text-sm" value={editPayFreq} onChange={e => handleEditPayFreqChange(e.target.value)}>
                      <option value="1_month">1 Month</option>
                      <option value="15_days">15 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-sm">Payment Day(s) of Month</label>
                    <input type="hidden" name="payment_days" value={editPayFreq === "15_days" ? `${editPayDay1},${editPayDay2}` : `${editPayDay1}`} />
                    {editPayDaysLocked ? (
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={editPayFreq === "15_days" ? `${editPayDay1}, ${editPayDay2}` : `${editPayDay1}`} className="form-input bg-gray-50 text-gray-500 cursor-not-allowed text-sm flex-1" />
                        <button type="button" onClick={() => setEditPayDaysLocked(false)} className="p-2 text-gray-400 hover:text-blue-600 flex-shrink-0" title="Edit payment days"><Pencil className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {editPayFreq === "15_days" ? (
                          <>
                            <select value={editPayDay1} onChange={e => setEditPayDay1(parseInt(e.target.value))} className="form-select text-sm w-[80px]">
                              {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <span className="text-gray-400">,</span>
                            <select value={editPayDay2} onChange={e => setEditPayDay2(parseInt(e.target.value))} className="form-select text-sm w-[80px]">
                              {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </>
                        ) : (
                          <select value={editPayDay1} onChange={e => setEditPayDay1(parseInt(e.target.value))} className="form-select text-sm w-[90px] flex-1">
                            {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        )}
                        <button type="button" onClick={() => setEditPayDaysLocked(true)} className="p-2 text-blue-600 hover:text-gray-400 flex-shrink-0" title="Lock"><Check className="w-4 h-4" /></button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{editPayFreq === "15_days" ? "Two payments per month on these days" : "One payment per month on this day"}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="form-label text-sm">Agreement Start Date <span className="text-red-500 ml-0.5">*</span></label>
                  <input name="agreement_start_date" type="date" required value={editAgreementStartDate} onChange={e => handleEditAgreementStartDateChange(e.target.value)} className="form-input text-sm" />
                </div>
                <div>
                  <label className="form-label text-sm">Agreement Period <span className="text-red-500 ml-0.5">*</span></label>
                  <select name="agreement_period" required className="form-select text-sm" value={editAgreementPeriod} onChange={e => handleEditAgreementPeriodChange(e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">1 Year</option>
                  </select>
                </div>
                <div>
                  <label className="form-label text-sm">Renew Date <span className="text-red-500 ml-0.5">*</span></label>
                  <input name="renew_date" type="date" required value={editRenewDate} onChange={e => setEditRenewDate(e.target.value)} className="form-input text-sm" />
                </div>
                <div>
                  <label className="form-label text-sm">Notes</label>
                  <textarea name="notes" defaultValue={vehicle.notes ?? ""} rows={2} className="form-input text-sm resize-none" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

              {/* Documents */}
              <div className="border-t border-gray-100 pt-4 mt-4">
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
                </div>
              </div>

              {/* Photos */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Vehicle Photos</p>
                <FileUploader
                  label="(JPG/PNG, max 5MB per photo, up to 6)"
                  bucket="vehicle-documents"
                  folder={`${vehicle.reg_number}/photos`}
                  accept="image/*"
                  multiple={true}
                  maxFiles={6}
                  initialFiles={localPhotos.map(p => ({ id: p.id, url: p.url, path: p.storage_path, isNew: false }))}
                  customUploadAction={async (file) => {
                    const res = await uploadVehiclePhoto(vehicle.id, file, localPhotos.length === 0);
                    if (res.error) return { error: res.error };
                    setLocalPhotos(prev => [...prev, { id: res.id, url: res.url, storage_path: res.path }]);
                    return { url: res.url, path: res.path, id: res.id };
                  }}
                  customDeleteAction={async (path, url, fileId) => {
                    if (!fileId) return { error: "Missing file ID" };
                    const res = await deleteVehiclePhoto(fileId, path, vehicle.id);
                    if (res && "error" in res) return { error: res.error as string };
                    setLocalPhotos(prev => prev.filter(p => p.id !== fileId));
                    return {};
                  }}
                />
              </div>

              {/* Rate Tiers */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Rate Tiers</p>
                <div className="flex items-end gap-3 mb-4">
                  <div className="flex-1 max-w-[200px]">
                    <label className="form-label text-sm">Monthly Rate (LKR)</label>
                    <input type="number" value={editMonthlyRate} onChange={e => handleMonthlyRateChange(e.target.value)} className="form-input text-sm" />
                  </div>
                  <p className="text-xs text-gray-400 pb-2">Auto-calculates tiers below</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rateTiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 mb-0.5">{TIER_LABELS[i] || `Tier ${i + 1}`}</p>
                        <p className="text-xs text-gray-400">{tier.days_from}–{tier.days_to ?? '∞'} days</p>
                      </div>
                      <input
                        type="number"
                        value={tier.rate_per_day}
                        onChange={e => {
                          const newTiers = [...rateTiers];
                          newTiers[i] = { ...newTiers[i], rate_per_day: +e.target.value };
                          setRateTiers(newTiers);
                        }}
                        className="form-input w-28 text-sm"
                      />
                      <span className="text-sm text-gray-400">/day</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setEditing(false); setEditBrand(vehicle.brand); setEditModel(vehicle.model); setError(null); }} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary text-sm">
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
          )}

      {!editing && (
      <Tabs defaultValue="details">
        <div className="section-card">
          <div className="px-5 pt-4 flex items-center justify-between border-b border-gray-100 pb-0 flex-wrap gap-3">
            <TabsList className="border-b-0">
              <TabsTrigger value="details"><Car className="w-3.5 h-3.5 mr-1.5 inline" />Details</TabsTrigger>
              <TabsTrigger value="updates"><History className="w-3.5 h-3.5 mr-1.5 inline" />Updates</TabsTrigger>
              {vehicle.source === "Supplier" && vehicle.supplier && (
                <TabsTrigger value="supplier"><Package className="w-3.5 h-3.5 mr-1.5 inline" />Supplier</TabsTrigger>
              )}
              <TabsTrigger value="images"><ImageIcon className="w-3.5 h-3.5 mr-1.5 inline" />Images</TabsTrigger>
              <TabsTrigger value="insurance"><Shield className="w-3.5 h-3.5 mr-1.5 inline" />Insurance & Service</TabsTrigger>
              <TabsTrigger value="pricing"><DollarSign className="w-3.5 h-3.5 mr-1.5 inline" />Pricing</TabsTrigger>
              <TabsTrigger value="rentals"><ClipboardList className="w-3.5 h-3.5 mr-1.5 inline" />Rentals</TabsTrigger>
              <TabsTrigger value="financials"><TrendingUp className="w-3.5 h-3.5 mr-1.5 inline" />Financials</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
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
                  { label: "Nickname", value: vehicle.nickname ?? "—" },
                  { label: "Brand", value: vehicle.brand },
                  { label: "Model", value: vehicle.model },
                  { label: "Year", value: vehicle.year?.toString() ?? "—" },
                  { label: "Color", value: vehicle.color ?? "—" },
                  { label: "Type", value: <StatusBadge status={vehicle.type?.toLowerCase() || "unknown"} /> },
                  { label: "Source", value: <StatusBadge status={vehicle.source?.toLowerCase() || "unknown"} /> },
                  { label: "Company", value: vehicle.company?.name ?? "—" },
                  { label: "Supplier", value: vehicle.supplier?.name ?? "—" },
                  { label: "Fuel Type", value: vehicle.fuel_type ?? "—" },
                  { label: "Transmission", value: vehicle.transmission ?? "—" },
                  { label: "Status", value: <StatusBadge status={vehicle.status} /> },
                  { label: "Current KM", value: <span>{(vehicle.current_km || 0).toLocaleString()} km <span className="text-xs text-gray-400">(updated {formatDate(vehicle.updated_at)})</span></span> },
                  { label: "Agreement Start Date", value: formatDate(vehicle.agreement_start_date) },
                  { label: "Agreement Period", value: vehicle.agreement_period ? `${vehicle.agreement_period} Months` : "—" },
                  { label: "Renew Date", value: formatDate(vehicle.renew_date) },
                  { label: "Monthly Rate", value: (() => { const t4 = vehicle.rate_tiers?.find(t => t.days_from === 22); return formatCurrency(t4 ? t4.rate_per_day * 30 : vehicle.daily_rate * 30); })() },
                  { label: "Next Service KM", value: (vehicle.next_service_km || 0).toLocaleString() + " km" },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                    <div className="text-sm font-medium text-gray-900">{f.value}</div>
                  </div>
                ))}
              </div>

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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.registration_document_url!, title: 'Registration Document' })} className="btn-secondary text-xs">View Document</button>
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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.revenue_license_url!, title: 'Revenue License' })} className="btn-secondary text-xs">View Document</button>
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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.eco_test_url!, title: 'Eco Test' })} className="btn-secondary text-xs">View Document</button>
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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.insurance_url!, title: 'Insurance' })} className="btn-secondary text-xs">View Document</button>
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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.service_tag_url!, title: 'Service Tag' })} className="btn-secondary text-xs">View Document</button>
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

          {/* ── UPDATES ── */}
          <TabsContent value="updates" className="mt-0">
            <VehicleUpdatesTab vehicleId={vehicle.id} currentKm={vehicle.current_km || 0} vehicleStatus={vehicle.status} />
          </TabsContent>

          {/* ── SUPPLIER ── */}
          {vehicle.source === "Supplier" && vehicle.supplier && (
            <TabsContent value="supplier" className="mt-0">
              <div className="p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Supplier Details</p>
                  </div>
                  <Link href={`/suppliers/${vehicle.supplier.id}`} className="btn-secondary text-xs inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> View Supplier
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Name</p>
                    <Link href={`/suppliers/${vehicle.supplier.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline">{vehicle.supplier.name}</Link>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{vehicle.supplier.phone ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Email</p>
                    <p className="text-sm font-medium text-gray-900">{vehicle.supplier.email ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">NIC</p>
                    <p className="text-sm font-medium text-gray-900">{vehicle.supplier.nic ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Address</p>
                    <p className="text-sm font-medium text-gray-900">{vehicle.supplier.address ?? "—"}</p>
                  </div>
                  {vehicle.supplier.notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400 mb-0.5">Notes</p>
                      <p className="text-sm text-gray-600">{vehicle.supplier.notes}</p>
                    </div>
                  )}
                </div>

                {(vehicle.supplier.bank || vehicle.supplier.account_number || vehicle.supplier.branch) && (
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Bank Details</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Bank</p>
                        <p className="text-sm font-medium text-gray-900">{vehicle.supplier.bank ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Account Number</p>
                        <p className="text-sm font-medium text-gray-900">{vehicle.supplier.account_number ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Branch</p>
                        <p className="text-sm font-medium text-gray-900">{vehicle.supplier.branch ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Schedule */}
                {vehicle.payment_days && (
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Payment Schedule</p>
                    <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Supplier Payment</span>
                        <span className="text-sm font-bold text-gray-900">{vehicle.monthly_cost ? formatCurrency(vehicle.monthly_cost) : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Frequency</span>
                        <span className="text-sm font-medium text-gray-700">{vehicle.payment_frequency === '15_days' ? '15 Days (2x/month)' : '1 Month'}</span>
                      </div>
                      <div className="border-t border-amber-200 pt-3">
                        <p className="text-xs text-gray-500 mb-2">Payment Days</p>
                        <div className="space-y-1.5">
                          {(vehicle.payment_days || "").split(",").map((day: string, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-100">
                              <span className="text-sm font-medium text-gray-800">Day {day.trim()} of every month</span>
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
              </div>
            </TabsContent>
          )}

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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.registration_document_url!, title: 'Registration Document' })} className="btn-secondary text-xs">View Document</button>
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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.revenue_license_url!, title: 'Revenue License' })} className="btn-secondary text-xs">View Document</button>
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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.eco_test_url!, title: 'Eco Test' })} className="btn-secondary text-xs">View Document</button>
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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.insurance_url!, title: 'Insurance' })} className="btn-secondary text-xs">View Document</button>
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
                      <button onClick={() => setDocViewer({ open: true, url: vehicle.service_tag_url!, title: 'Service Tag' })} className="btn-secondary text-xs">View Document</button>
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
                        p.url ? (
                        <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block group">
                          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                            <img src={p.url} alt="Vehicle" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded transition-opacity">View Full</span>
                            </div>
                          </div>
                        </a>
                        ) : null
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
                    ...(vehicle.fuel_type === "Petrol" || vehicle.fuel_type === "Diesel" ? [{ label: "Eco Test Expiry", value: vehicle.eco_test_expiry, icon: "🍃" }] : []),
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
                          <p className="text-xs text-gray-500 mb-0.5">{TIER_LABELS[i] || 'Duration'}</p>
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
                <p className="text-xs text-blue-500 font-semibold mb-1">Monthly Rate</p>
                <p className="text-2xl font-bold text-gray-900">{(() => {
                  const tier4 = vehicle.rate_tiers?.find(t => t.days_from === 22);
                  const monthly = tier4 ? tier4.rate_per_day * 30 : vehicle.daily_rate * 30;
                  return formatCurrency(monthly);
                })()}<span className="text-sm font-normal text-gray-400"> / month</span></p>
                <p className="text-xs text-gray-400 mt-1">{formatCurrency(vehicle.daily_rate)} / day</p>
              </div>

              {vehicle.source === "Supplier" && vehicle.monthly_cost && (
                <div className="border border-amber-100 rounded-xl p-4 bg-amber-50/40">
                  <p className="text-xs text-amber-600 font-semibold mb-1">Supplier Payment</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(vehicle.monthly_cost)}<span className="text-sm font-normal text-gray-400"> / month</span></p>
                  {vehicle.payment_frequency && vehicle.payment_days && (
                    <p className="text-xs text-gray-400 mt-1">
                      {vehicle.payment_frequency === '15_days' ? 'Every 15 days' : 'Monthly'} on day{vehicle.payment_days.includes(',') ? 's' : ''} {vehicle.payment_days}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-amber-200">
                    <span className="text-xs text-amber-600 font-semibold">Monthly Profit</span>
                    <span className="text-base font-bold text-green-700">{(() => {
                      const t4 = vehicle.rate_tiers?.find(t => t.days_from === 22);
                      const monthly = t4 ? t4.rate_per_day * 30 : vehicle.daily_rate * 30;
                      return formatCurrency(monthly - (vehicle.monthly_cost || 0));
                    })()}</span>
                  </div>
                </div>
              )}
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
      )}

      <PasswordConfirmModal open={confirmEdit} onOpenChange={setConfirmEdit} title="Save Changes" description="Please verify your password to save changes to this vehicle." onConfirm={performEdit} />
      <PasswordConfirmModal open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete Vehicle" description="This will permanently deactivate this vehicle." onConfirm={performDelete} variant="danger" />

      <DocumentViewer open={docViewer.open} onOpenChange={(o) => setDocViewer({ ...docViewer, open: o })} url={docViewer.url} title={docViewer.title} />
    </div>
  );
}