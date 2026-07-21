import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusColorMap: Record<string, string> = {
  available: "bg-green-50 text-green-700 border border-green-100",
  rented: "bg-blue-50 text-blue-700 border border-blue-100",
  active: "bg-blue-50 text-blue-700 border border-blue-100",
  paused: "bg-violet-50 text-violet-700 border border-violet-100",
  booked: "bg-amber-50 text-amber-700 border border-amber-100",
  in_garage: "bg-purple-50 text-purple-700 border border-purple-100",
  owner_returned: "bg-teal-50 text-teal-700 border border-teal-100",
  returned: "bg-gray-100 text-gray-600 border border-gray-200",
  completed: "bg-slate-100 text-slate-700 border border-slate-200",
  extended: "bg-amber-50 text-amber-700 border border-amber-100",
  swapped: "bg-sky-50 text-sky-700 border border-sky-100",
  overdue: "bg-red-50 text-red-700 border border-red-100",
  cancelled: "bg-red-50 text-red-400 border border-red-100",
  pending: "bg-gray-100 text-gray-500 border border-gray-200",
  partial: "bg-amber-50 text-amber-600 border border-amber-100",
  paid: "bg-green-50 text-green-700 border border-green-100",
  balance_due: "bg-red-50 text-red-700 border border-red-100",
  refund_pending: "bg-purple-600 text-white border border-purple-600",
  on_time: "bg-green-50 text-green-700 border border-green-100", // <-- Changed to color classes
  late: "bg-amber-50 text-amber-700 border border-amber-100",
  absent: "bg-red-50 text-red-700 border border-red-100",
  company: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  supplier: "bg-orange-50 text-orange-700 border border-orange-100",
  admin: "bg-blue-50 text-blue-700 border border-blue-100",
  employee: "bg-gray-100 text-gray-600 border border-gray-200",
};

const statusLabelMap: Record<string, string> = {
  overdue: "Service Overdue",
  in_garage: "In Garage",
  owner_returned: "Owner Returned",
  available: "Available",
  rented: "Rented",
  active: "Active",
  paused: "Paused",
  booked: "Booked",
  returned: "Returned",
  completed: "Completed",
  extended: "Extended",
  swapped: "Swapped",
  cancelled: "Cancelled",
  pending: "Pending",
  partial: "Partial",
  paid: "Paid",
  balance_due: "Balance Due",
  refund_pending: "Refund Pending",
  on_time: "On Time", // <-- Fixed the space issue here
  late: "Late",
  absent: "Absent",
  company: "Company",
  supplier: "Supplier",
  admin: "Admin",
  employee: "Employee",
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  // If the status comes in as "on time" (with a space), we replace it with an underscore so it matches our maps
  const key = (status ?? "").toLowerCase().replace(/ /g, "_");
  
  const colorClass = statusColorMap[key] ?? "bg-gray-100 text-gray-600 border border-gray-200";
  const label = statusLabelMap[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      colorClass,
      className
    )}>
      {label}
    </span>
  );
}