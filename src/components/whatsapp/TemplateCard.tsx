"use client";

import ToggleSwitch from "@/components/whatsapp/ToggleSwitch";
import PlaceholderButtons from "@/components/whatsapp/PlaceholderButtons";
import { TemplateItem } from "@/components/whatsapp/types";

interface TemplateCardProps {
  template: TemplateItem;
  onChange: (next: TemplateItem) => void;
  onSave: (template: TemplateItem) => Promise<void>;
}

export default function TemplateCard({ template, onChange, onSave }: TemplateCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/95 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
          <div className="mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {template.type}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure and personalize this template for automated and manual messaging.
          </p>
        </div>
        <ToggleSwitch
          checked={template.isActive}
          onChange={(value) => onChange({ ...template, isActive: value })}
        />
      </div>

      <textarea
        value={template.message}
        onChange={(event) => onChange({ ...template, message: event.target.value })}
        className="h-36 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none transition focus:border-emerald-500"
      />

      <div className="mt-4">
        <PlaceholderButtons
          onInsert={(token) =>
            onChange({
              ...template,
              message: `${template.message}${template.message.endsWith(" ") || template.message.length === 0 ? "" : " "}${token}`,
            })
          }
        />
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => onSave(template)}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          Save
        </button>
      </div>
    </div>
  );
}
