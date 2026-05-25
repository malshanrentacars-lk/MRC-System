"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FiMessageCircle, FiMail, FiSend, FiSearch, FiFilter } from "react-icons/fi";
import { MessageLogItem, RentalItem, TemplateItem } from "@/components/whatsapp/types";
import { defaultWhatsAppTemplates } from "@/lib/whatsappDefaults";

const WhatsAppTabs = dynamic(() => import("@/components/whatsapp/WhatsAppTabs"), {
  ssr: false,
  loading: () => <div className="h-14 rounded-2xl border border-border bg-card/95 p-2 shadow-sm" />,
});

const TemplateCard = dynamic(() => import("@/components/whatsapp/TemplateCard"), {
  ssr: false,
  loading: () => <div className="h-72 rounded-2xl border border-border bg-card/95 shadow-sm" />,
});

const MessagePreview = dynamic(() => import("@/components/whatsapp/MessagePreview"), {
  ssr: false,
  loading: () => <div className="h-56 rounded-2xl border border-border bg-card/95 shadow-sm" />,
});

const LogsTable = dynamic(() => import("@/components/whatsapp/LogsTable"), {
  ssr: false,
  loading: () => <div className="h-72 rounded-2xl border border-border bg-card/95 shadow-sm" />,
});

type TabType = "templates" | "send" | "logs";

type ToastType = {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error";
};

type ApiListResponse<T> = {
  data?: T[];
  warning?: string;
};

function applyTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(.*?)\}/g, (_, key: string) => data[key.trim()] || "");
}

export default function WhatsAppClient() {
  const [activeTab, setActiveTab] = useState<TabType>("templates");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [logs, setLogs] = useState<MessageLogItem[]>([]);
  const [selectedRental, setSelectedRental] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState<"all" | "Sent" | "Delivered" | "Failed" | "Read">("all");
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const deferredLogSearch = useDeferredValue(logSearch);

  const showToast = (toast: Omit<ToastType, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    const [templateResult, rentalResult, logResult] = await Promise.allSettled([
      axios.get<ApiListResponse<TemplateItem>>("/api/templates"),
      axios.get<ApiListResponse<RentalItem>>("/api/rentals"),
      axios.get<ApiListResponse<MessageLogItem>>("/api/logs"),
    ]);

    if (templateResult.status === "fulfilled") {
      const payload = templateResult.value.data;
      const templateList = Array.isArray(payload.data) ? payload.data : [];
      const safeTemplates = templateList.length ? templateList : defaultWhatsAppTemplates;
      setTemplates(safeTemplates);
      if (payload.warning) {
        showToast({ title: "WhatsApp module in safe mode", description: payload.warning, variant: "error" });
      }
    } else {
      setTemplates(defaultWhatsAppTemplates);
      showToast({
        title: "Templates unavailable",
        description: templateResult.reason instanceof Error ? templateResult.reason.message : "Using default templates.",
        variant: "error",
      });
    }

    if (rentalResult.status === "fulfilled") {
      const payload = rentalResult.value.data;
      setRentals(Array.isArray(payload.data) ? payload.data : []);
      if (payload.warning) {
        showToast({ title: "Customer data unavailable", description: payload.warning, variant: "error" });
      }
    } else {
      setRentals([]);
    }

    if (logResult.status === "fulfilled") {
      const payload = logResult.value.data;
      setLogs(Array.isArray(payload.data) ? payload.data : []);
    } else {
      setLogs([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get<ApiListResponse<MessageLogItem>>("/api/logs");
        setLogs(Array.isArray(res.data.data) ? res.data.data : []);
      } catch {
        // Ignore silent polling errors.
      }
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const selectedRentalObject = rentals.find((rental) => rental._id === selectedRental);
  const selectedTemplateObject = templates.find((template) => template._id === selectedTemplate);

  useEffect(() => {
    if (!selectedRentalObject || !selectedTemplateObject) return;

    const mapped = applyTemplate(selectedTemplateObject.message, {
      customerFirstName: selectedRentalObject.customerName.split(" ")[0] || "",
      customerLastName: selectedRentalObject.customerName.split(" ").slice(1).join(" "),
      customerName: selectedRentalObject.customerName,
      companyName: "MRC",
      companyPhone: "+94XXXXXXXXX",
      vehicleName: selectedRentalObject.vehicleName,
      vehicleRegNo: selectedRentalObject.vehicleRegNo,
      pickupDate: new Date(selectedRentalObject.pickupDate).toLocaleDateString(),
      returnDate: new Date(selectedRentalObject.returnDate).toLocaleDateString(),
      rentalNumber: selectedRentalObject._id.slice(-6).toUpperCase(),
      totalAmount: "0.00",
    });

    setPreviewMessage(mapped);
  }, [selectedRentalObject, selectedTemplateObject]);

  const handleTemplateSave = async (template: TemplateItem) => {
    try {
      await axios.put(`/api/templates/${template._id}`, {
        name: template.name,
        type: template.type,
        message: template.message,
        isActive: template.isActive,
        channel: template.channel,
      });
      showToast({ title: "Template saved", variant: "success" });
      await loadData();
    } catch (error) {
      showToast({
        title: "Unable to save template",
        description: (error as Error).message,
        variant: "error",
      });
    }
  };

  const sendMessage = async (channel: "whatsapp" | "email" | "both") => {
    if (!selectedRentalObject || !previewMessage.trim()) {
      showToast({ title: "Select customer and template", variant: "error" });
      return;
    }

    setIsSending(true);
    try {
      if (channel === "whatsapp") {
        await axios.post("/api/send/whatsapp", {
          to: `whatsapp:${selectedRentalObject.customerPhone}`,
          customer: selectedRentalObject.customerName,
          message: previewMessage,
        });
      } else if (channel === "email") {
        await axios.post("/api/send/email", {
          to: selectedRentalObject.customerEmail,
          customer: selectedRentalObject.customerName,
          subject: "MRC Rental Update",
          message: previewMessage,
        });
      } else {
        await axios.post("/api/send/both", {
          phoneTo: `whatsapp:${selectedRentalObject.customerPhone}`,
          emailTo: selectedRentalObject.customerEmail,
          customer: selectedRentalObject.customerName,
          subject: "MRC Rental Update",
          message: previewMessage,
        });
      }

      showToast({ title: "Message sent", variant: "success" });
      const logsRes = await axios.get<ApiListResponse<MessageLogItem>>("/api/logs");
      setLogs(Array.isArray(logsRes.data.data) ? logsRes.data.data : []);
    } catch (error) {
      showToast({ title: "Send failed", description: (error as Error).message, variant: "error" });
    } finally {
      setIsSending(false);
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await axios.delete(`/api/logs?id=${id}`);
      setLogs((prev) => prev.filter((item) => item._id !== id));
      showToast({ title: "Log deleted", variant: "success" });
    } catch (error) {
      showToast({ title: "Delete failed", description: (error as Error).message, variant: "error" });
    }
  };

  const filteredLogs = useMemo(() => {
    const safeLogs = Array.isArray(logs) ? logs : [];
    return safeLogs.filter((log) => {
      const matchesSearch =
        log.customer.toLowerCase().includes(deferredLogSearch.toLowerCase()) ||
        log.message.toLowerCase().includes(deferredLogSearch.toLowerCase());
      const matchesFilter = logFilter === "all" || log.status === logFilter;
      return matchesSearch && matchesFilter;
    });
  }, [logs, logFilter, deferredLogSearch]);

  return (
    <div className="space-y-5 rounded-2xl bg-background p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-border bg-card/95 p-5 shadow-sm backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
            <FiMessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Template-driven messaging hub with logs and automation.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Templates</p>
          <p className="mt-2 text-sm text-foreground">Edit WhatsApp and email templates with dynamic placeholders.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Automation Ready</p>
          <p className="mt-2 text-sm text-foreground">Birthday wishes and due reminders are preloaded for cron-driven automation.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Delivery Logs</p>
          <p className="mt-2 text-sm text-foreground">Track sent, delivered, failed, and read messages from one table.</p>
        </div>
      </div>

      <WhatsAppTabs activeTab={activeTab} onChange={setActiveTab} />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : null}

      {!isLoading && activeTab === "templates" ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid gap-4 lg:grid-cols-2"
        >
          {templates.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              onChange={(nextTemplate) => {
                setTemplates((prev) => prev.map((item) => (item._id === nextTemplate._id ? nextTemplate : item)));
              }}
              onSave={handleTemplateSave}
            />
          ))}
        </motion.div>
      ) : null}

      {!isLoading && activeTab === "send" ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-foreground">Customer</label>
              <select
                value={selectedRental}
                onChange={(event) => setSelectedRental(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-500"
              >
                <option value="">Select customer</option>
                {rentals.map((rental) => (
                  <option key={rental._id} value={rental._id}>
                    {rental.customerName} - {rental.vehicleName}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-foreground">Template</label>
              <select
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-500"
              >
                <option value="">Select template</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <MessagePreview message={previewMessage} onMessageChange={setPreviewMessage} />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSending}
              onClick={() => sendMessage("whatsapp")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <FiSend className="h-4 w-4" />
              Send WhatsApp
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={() => sendMessage("email")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-emerald-500/40"
            >
              <FiMail className="h-4 w-4" />
              Send Email
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={() => sendMessage("both")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-emerald-500/40"
            >
              <FiMessageCircle className="h-4 w-4" />
              Send Both
            </button>
          </div>
        </motion.div>
      ) : null}

      {!isLoading && activeTab === "logs" ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="grid gap-3 md:grid-cols-3">
              <div className="relative md:col-span-2">
              <FiSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input
                value={logSearch}
                onChange={(event) => setLogSearch(event.target.value)}
                placeholder="Search by customer or message"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-emerald-500"
              />
            </div>
            <div className="relative">
              <FiFilter className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <select
                value={logFilter}
                onChange={(event) => setLogFilter(event.target.value as typeof logFilter)}
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="Delivered">Delivered</option>
                <option value="Failed">Failed</option>
                <option value="Read">Read</option>
              </select>
            </div>
          </div>

          <LogsTable logs={filteredLogs} onDelete={deleteLog} />
        </motion.div>
      ) : null}

      <div className="pointer-events-none fixed right-6 top-6 z-50 space-y-2">
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`w-72 rounded-xl border px-4 py-3 text-sm shadow-xl ${
              item.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            }`}
          >
            <p className="font-semibold">{item.title}</p>
            {item.description ? <p className="mt-1 text-xs opacity-90">{item.description}</p> : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
