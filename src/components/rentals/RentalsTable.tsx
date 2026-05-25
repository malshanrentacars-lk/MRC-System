import React from 'react';

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Overdue: 'bg-red-100 text-red-800',
    Completed: 'bg-gray-100 text-gray-800',
  };
  return <span className={`px-2 py-1 rounded-full text-sm ${map[status] || 'bg-gray-100'}`}>{status}</span>;
}

export default function RentalsTable() {
  const rows = [
    { id: 'R-001', customer: 'Perera', vehicle: 'Toyota Aqua (CAR-0001)', amount: 'LKR 4,500', status: 'Active' },
    { id: 'R-002', customer: 'Kumar', vehicle: 'Honda Fit (ABC-1234)', amount: 'LKR 3,500', status: 'Pending' },
    { id: 'R-003', customer: 'Chanuka', vehicle: 'Toyota Aqua (CAR-0001)', amount: 'LKR 4,500', status: 'Overdue' },
  ];

  return (
    <div className="bg-white border rounded-lg p-4">
      <table className="w-full table-auto">
        <thead>
          <tr className="text-sm text-left text-gray-600">
            <th className="p-2">Actions / ID</th>
            <th className="p-2">Customer</th>
            <th className="p-2">Vehicle</th>
            <th className="p-2 text-right">Amount</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 text-sm">
                <div className="flex items-center gap-2">
                  <button className="btn btn-xs">View</button>
                  <div className="text-xs text-gray-500">{r.id}</div>
                </div>
              </td>
              <td className="p-2">{r.customer}</td>
              <td className="p-2">{r.vehicle}</td>
              <td className="p-2 text-right font-medium">{r.amount}</td>
              <td className="p-2">
                <StatusPill status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
