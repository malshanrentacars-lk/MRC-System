import React from 'react';

function Card({ title, value, tone = 'default' }: { title: string; value: string; tone?: string }) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm w-48">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

export default function KpiCards() {
  return (
    <div className="flex gap-4">
      <Card title="Active Rentals" value="12" />
      <Card title="Pending Pickups" value="3" />
      <Card title="Overdue Returns" value="1" />
      <Card title="Total Revenue (M)" value="LKR 120,000" />
    </div>
  );
}
