import React from 'react';

export default function Pagination() {
  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <div>Showing 1 to 10 of 15</div>
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost">First</button>
        <button className="btn btn-ghost">Prev</button>
        <button className="btn btn-ghost">1</button>
        <button className="btn btn-ghost">2</button>
        <button className="btn btn-ghost">Next</button>
        <button className="btn btn-ghost">Last</button>
      </div>
    </div>
  );
}
