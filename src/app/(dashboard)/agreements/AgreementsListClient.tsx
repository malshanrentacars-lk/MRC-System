"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileEdit, Trash2, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { createTemplate, updateTemplate, deleteTemplate, setActiveTemplate, type AgreementTemplate } from "@/app/actions/agreements";

interface Props {
  isAdmin: boolean;
  templates: AgreementTemplate[];
}

export default function AgreementsListClient({ templates: initialTemplates, isAdmin }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"rental" | "supplier">("rental");
  const [formContent, setFormContent] = useState("");

  function startEdit(t: AgreementTemplate) {
    setEditId(t.id);
    setFormName(t.name);
    setFormType(t.type);
    setFormContent(t.content);
    setShowForm(true);
  }

  function startCreate() {
    setEditId(null);
    setFormName("");
    setFormType("rental");
    setFormContent("");
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", formName);
    fd.set("type", formType);
    fd.set("content", formContent);
    startTransition(async () => {
      if (editId) {
        await updateTemplate(editId, fd);
      } else {
        await createTemplate(fd);
      }
      setShowForm(false);
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    startTransition(async () => {
      await deleteTemplate(id);
      router.refresh();
    });
  }

  async function handleSetActive(id: string, type: string) {
    startTransition(async () => {
      await setActiveTemplate(id, type);
      router.refresh();
    });
  }

  return (
    <div className="section-card overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Create agreement format templates with placeholders like {'{customer_name}'}, {'{vehicle_reg}'}, etc.
        </p>
        {!showForm && (
          <button onClick={startCreate} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {showForm && (
        <div className="p-5 bg-blue-50/30 border-b border-gray-100">
          <form onSubmit={handleSave} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label text-xs">Name <span className="text-red-500">*</span></label>
                <input value={formName} onChange={e => setFormName(e.target.value)} required className="form-input text-sm" placeholder="e.g. Standard Rental Agreement" />
              </div>
              <div>
                <label className="form-label text-xs">Type <span className="text-red-500">*</span></label>
                <select value={formType} onChange={e => setFormType(e.target.value as any)} className="form-select text-sm">
                  <option value="rental">Rental Agreement</option>
                  <option value="supplier">Supplier Agreement</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label text-xs">
                HTML Content <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-2">
                  (Use {'{placeholder}'} for dynamic values)
                </span>
              </label>
              <textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                required
                rows={16}
                className="form-input text-sm font-mono resize-y"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              <p className="font-semibold mb-1">Available placeholders:</p>
              {formType === "rental" ? (
                <p>
                  {'{company_name}'} {'{company_address}'} {'{company_phone}'} {'{rental_number}'}<br />
                  {'{customer_name}'} {'{customer_nic}'} {'{customer_phone}'} {'{customer_email}'} {'{customer_address}'} {'{customer_license}'}<br />
                  {'{guarantor_name}'} {'{guarantor_nic}'} {'{guarantor_phone}'} {'{guarantor_address}'}<br />
                  {'{vehicle_reg}'} {'{vehicle_brand}'} {'{vehicle_model}'} {'{vehicle_year}'} {'{vehicle_fuel_type}'} {'{vehicle_transmission}'}<br />
                  {'{pickup_km}'} {'{return_km}'} {'{start_date}'} {'{end_date}'} {'{total_days}'} {'{daily_rate}'}<br />
                  {'{additional_charges}'} {'{discount}'} {'{total_amount}'} {'{deposit}'} {'{printed_date}'} {'{notes_section}'}
                </p>
              ) : (
                <p>
                  {'{company_name}'} {'{company_address}'} {'{company_phone}'}<br />
                  {'{supplier_name}'} {'{supplier_phone}'} {'{supplier_email}'} {'{supplier_nic}'} {'{supplier_address}'}<br />
                  {'{supplier_bank}'} {'{supplier_account_number}'} {'{supplier_branch}'}<br />
                  {'{vehicle_reg}'} {'{vehicle_brand}'} {'{vehicle_model}'} {'{vehicle_year}'} {'{vehicle_fuel_type}'} {'{vehicle_transmission}'} {'{vehicle_km}'}<br />
                  {'{agreement_start_date}'} {'{agreement_period}'} {'{renew_date}'} {'{monthly_cost}'}<br />
                  {'{payment_frequency}'} {'{payment_days}'} {'{payment_type}'} {'{printed_date}'} {'{notes_section}'}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isPending} className="btn-primary text-sm">
                {isPending ? "Saving..." : editId ? "Update Template" : "Create Template"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.id}>
                <td className="font-medium">{t.name}</td>
                <td className="capitalize">{t.type}</td>
                <td>
                  {t.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <button onClick={() => handleSetActive(t.id, t.type)} className="text-xs text-blue-600 hover:text-blue-700">
                      Set Active
                    </button>
                  )}
                </td>
                <td className="text-xs text-gray-400">{formatDate(t.updated_at)}</td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(t)} className="text-xs text-blue-600 hover:text-blue-700">
                      <FileEdit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-xs text-red-500 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No templates yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
