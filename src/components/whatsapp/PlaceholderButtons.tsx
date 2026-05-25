"use client";

const PLACEHOLDERS = [
  "{customerFirstName}",
  "{customerLastName}",
  "{customerName}",
  "{companyName}",
  "{companyPhone}",
  "{vehicleName}",
  "{vehicleRegNo}",
  "{pickupDate}",
  "{returnDate}",
  "{rentalNumber}",
  "{totalAmount}",
];

interface PlaceholderButtonsProps {
  onInsert: (placeholder: string) => void;
}

export default function PlaceholderButtons({ onInsert }: PlaceholderButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PLACEHOLDERS.map((placeholder) => (
        <button
          key={placeholder}
          type="button"
          onClick={() => onInsert(placeholder)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-emerald-500/50 hover:text-foreground"
        >
          {placeholder}
        </button>
      ))}
    </div>
  );
}
