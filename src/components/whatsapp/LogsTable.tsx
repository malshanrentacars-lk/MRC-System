"use client";

import { MessageLogItem } from "@/components/whatsapp/types";

interface LogsTableProps {
  logs: MessageLogItem[];
  onDelete: (id: string) => void;
}

function statusClass(status: MessageLogItem["status"]) {
  if (status === "Sent") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (status === "Delivered") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (status === "Read") return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  return "bg-red-500/15 text-red-300 border-red-500/30";
}

export default function LogsTable({ logs, onDelete }: LogsTableProps) {
  if (!logs.length) {
    return (
      <div className="rounded-2xl border border-border bg-card/95 p-10 text-center text-sm text-muted-foreground shadow-sm backdrop-blur">
        No message logs yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card/95 shadow-sm backdrop-blur">
      <table className="min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Channel</th>
            <th className="px-4 py-3">Message</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id} className="border-b border-border text-foreground hover:bg-muted/50">
              <td className="px-4 py-3">{log.customer}</td>
              <td className="px-4 py-3 capitalize">{log.channel}</td>
              <td className="max-w-md truncate px-4 py-3" title={log.message}>{log.message}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(log.status)}`}>
                  {log.status}
                </span>
              </td>
              <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onDelete(log._id)}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
