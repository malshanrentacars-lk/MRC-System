import { getRentalById } from "@/app/actions/rentals";
import { getCompanySettings } from "@/app/actions/users";
import { notFound } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Car, User, Shield } from "lucide-react";
import PrintButton from "./PrintButton";
import { formatAddress } from "@/lib/address";

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const [rental, settings] = await Promise.all([
    getRentalById(p.id),
    getCompanySettings(),
  ]);
  if (!rental) notFound();

  return (
    <div className="min-h-screen bg-white p-8 max-w-3xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } @page { margin: 1cm; } }` }} />

      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{settings?.company_name ?? "CarZone"}</h1>
            <p className="text-sm text-gray-600 mt-1">{formatAddress(settings)}</p>
            {settings?.phone && <p className="text-sm text-gray-600">{settings.phone}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-900 uppercase">Rental Agreement</h2>
            <p className="text-gray-600 text-sm mt-1">#{rental.rental_number}</p>
            <p className="text-gray-600 text-sm">Printed: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5"><User className="w-4 h-4" /> Customer / Renter</h3>
          <table className="w-full text-sm">
            <tbody>
              {[
                ["Full Name", rental.customer?.name],
                ["NIC", rental.customer?.nic],
                ["Phone", rental.customer?.phone],
                ["Alt Phone", rental.customer?.phone2],
                ["Email", rental.customer?.email],
                ["Address", formatAddress(rental.customer)],
                ["License No.", rental.customer?.license_number],
                ["License Expiry", formatDate(rental.customer?.license_expiry)],
              ].map(([l, v]) => v ? (
                <tr key={l as string} className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500 pr-3 w-28">{l}</td>
                  <td className="py-1.5 font-medium text-gray-900">{v}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
        </div>

        {rental.guarantor && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5"><Shield className="w-4 h-4" /> Guarantor</h3>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Full Name", rental.guarantor.name],
                  ["NIC", rental.guarantor.nic],
                  ["Phone", rental.guarantor.phone],
                  ["Address", formatAddress(rental.guarantor)],
                ].map(([l, v]) => v ? (
                  <tr key={l as string} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500 pr-3 w-28">{l}</td>
                    <td className="py-1.5 font-medium text-gray-900">{v}</td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vehicle */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5"><Car className="w-4 h-4" /> Vehicle Details</h3>
        <div className="grid grid-cols-3 gap-4 text-sm border border-gray-200 rounded-lg p-4">
          {[
            ["Reg. Number", rental.vehicle?.reg_number],
            ["Brand", rental.vehicle?.brand],
            ["Model", rental.vehicle?.model],
            ["Year", rental.vehicle?.year],
            ["Pickup KM", (rental.pickup_km ?? 0).toLocaleString() + " km"],
            ["Return KM", rental.return_km ? rental.return_km.toLocaleString() + " km" : "—"],
          ].map(([l, v]) => (
            <div key={l as string}>
              <p className="text-gray-500 text-xs">{l}</p>
              <p className="font-medium text-gray-900">{v || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rental Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Rental Period &amp; Charges</h3>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <tbody>
            {[
              ["Start Date", formatDate(rental.start_date)],
              ["Return Date", formatDate(rental.end_date)],
              ["Actual Return", formatDate(rental.actual_return_date)],
              ["Total Days", `${rental.total_days} days`],
              ["Daily Rate", formatCurrency(rental.daily_rate)],
              ["Subtotal", formatCurrency(rental.subtotal ?? 0)],
              ["Additional Charges", formatCurrency(rental.additional_charges)],
              ["Discount", `− ${formatCurrency(rental.discount)}`],
              ["TOTAL AMOUNT", formatCurrency(rental.total_amount ?? 0)],
              ["Deposit Paid", formatCurrency(rental.deposit)],
            ].map(([l, v], i) => (
              <tr key={l as string} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className={`px-4 py-2 text-gray-600 ${l === "TOTAL AMOUNT" ? "font-bold text-gray-900" : ""}`}>{l}</td>
                <td className={`px-4 py-2 text-right ${l === "TOTAL AMOUNT" ? "font-bold text-blue-700 text-base" : "font-medium text-gray-900"}`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {rental.notes && (
        <div className="mb-6 bg-amber-50 border border-amber-100 rounded-lg p-4">
          <p className="text-xs text-amber-700 font-semibold mb-1">Notes</p>
          <p className="text-sm text-amber-900">{rental.notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-10 grid grid-cols-3 gap-8 pt-4">
        {["Customer Signature", "Guarantor Signature", "Staff Signature"].map(label => (
          <div key={label} className="text-center">
            <div className="border-t border-gray-300 pt-2">
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
        This is a system-generated document. {settings?.company_name ?? "CarZone"} — All rights reserved.
      </div>

      {/* Print button — client component */}
      <div className="no-print mt-6 flex justify-center">
        <PrintButton />
      </div>
    </div>
  );
}
