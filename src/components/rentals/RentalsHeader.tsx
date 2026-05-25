import React from 'react';

export default function RentalsHeader() {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold">Rentals</h1>
        <p className="text-sm text-muted-foreground">Manage, track, and create vehicle rental agreements</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn btn-outline">Archived</button>
        <button className="btn btn-primary">+ New Rental</button>
      </div>
    </div>
  );
}
