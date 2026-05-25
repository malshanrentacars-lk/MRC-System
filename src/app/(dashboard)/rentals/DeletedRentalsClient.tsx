"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo, Trash2 } from "lucide-react";
import { Rental } from "@/types";
import { restoreRentals, destroyRentals } from "@/app/actions/rentals";

interface Props {
  rentals: Rental[];
}

export default function DeletedRentalsClient({ rentals }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function selectAll() {
    const map: Record<string, boolean> = {};
    rentals.forEach(r => (map[r.id] = true));
    setSelected(map);
  }

  function noneSelected() {
    return Object.values(selected).filter(Boolean).length === 0;
  }

  async function handleRestore() {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;
    startTransition(async () => {
      await restoreRentals(ids);
      router.refresh();
    });
  }

  async function handleClear() {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;
    if (!confirm(`Permanently delete ${ids.length} rental(s)? This cannot be undone.`)) return;
    startTransition(async () => {
      await destroyRentals(ids);
      router.refresh();
    });
  }

  return (
    <div className="section-card">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="btn" onClick={selectAll}>Select All</button>
            <button className="btn-primary" onClick={handleRestore} disabled={noneSelected() || isPending}>
              <Undo className="w-4 h-4 mr-2" /> Restore
            </button>
            <button className="btn-danger" onClick={handleClear} disabled={noneSelected() || isPending}>
              <Trash2 className="w-4 h-4 mr-2" /> Clear
            </button>
          </div>
          <div className="text-sm text-gray-500">{rentals.length} deleted rentals</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th />
              <th>Rental #</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Deleted At</th>
            </tr>
          </thead>
          <tbody>
            {rentals.map(r => (
              <tr key={r.id} className="border-b border-gray-100">
                <td>
                  <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggle(r.id)} />
                </td>
                <td className="font-semibold text-blue-600">{r.rental_number}</td>
                <td>
                  <div className="font-medium">{r.customer?.name}</div>
                  <div className="text-xs text-gray-400">{r.customer?.phone}</div>
                </td>
                <td>
                  <div className="font-medium">{r.vehicle?.brand} {r.vehicle?.model}</div>
                  <div className="text-xs text-gray-400">{r.vehicle?.reg_number}</div>
                </td>
                <td className="text-sm text-gray-500">{new Date(r.updated_at ?? r.created_at ?? '').toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
