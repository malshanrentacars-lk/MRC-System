import React from 'react';

export default function FilterToolbar() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <input placeholder="Search" className="form-input" />
        <input placeholder="Customer ID" className="form-input w-36" />
        <input placeholder="Vehicle reg" className="form-input w-40" />
      </div>

      <div className="flex items-center gap-2">
        <select className="form-select">
          <option>Status</option>
          <option>Active</option>
          <option>Completed</option>
          <option>Overdue</option>
        </select>
        <select className="form-select">
          <option>Payment Status</option>
          <option>Paid</option>
          <option>Pending</option>
        </select>
      </div>

      <div>
        <input type="text" placeholder="Date range" className="form-input" />
      </div>
    </div>
  );
}
