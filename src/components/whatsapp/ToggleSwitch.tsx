"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export default function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full border transition-all duration-200 ${
        checked
          ? "border-emerald-500/30 bg-emerald-500/15"
          : "border-border bg-muted"
      }`}
      aria-pressed={checked}
      aria-label="Toggle template"
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
          checked ? "left-6 bg-emerald-500" : "left-1 bg-card"
        }`}
      />
    </button>
  );
}
