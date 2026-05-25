"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CalendarWidgetProps {
  rentals: Array<{ id: string; rental_number: string; start_date: string; end_date: string; status: string; customers: unknown; vehicles: unknown }>;
  vehicles: Array<{ id: string; reg_number: string; next_service_date?: string | null; current_km: number; next_service_km: number; status: string }>;
}

type DayEvent = { type: "return" | "pickup" | "service"; label: string; color: string; link?: string };

function getEvents(date: Date, rentals: CalendarWidgetProps["rentals"], vehicles: CalendarWidgetProps["vehicles"]): DayEvent[] {
  const d = format(date, "yyyy-MM-dd");
  const events: DayEvent[] = [];

  rentals.forEach(r => {
    const c = (r.customers as any);
    const v = (r.vehicles as any);
    const customerName = Array.isArray(c) ? c[0]?.name : c?.name;
    const regNum = Array.isArray(v) ? v[0]?.reg_number : v?.reg_number;
    if (r.end_date === d && r.status === "active") {
      events.push({ type: "return", label: `Return: ${r.rental_number} ${customerName ?? ""} (${regNum ?? ""})`, color: "bg-blue-500", link: `/rentals/${r.id}` });
    }
    if (r.start_date === d && r.status === "booked") {
      events.push({ type: "pickup", label: `Pickup: ${r.rental_number} ${customerName ?? ""} (${regNum ?? ""})`, color: "bg-amber-500", link: `/rentals/${r.id}` });
    }
  });

  vehicles.forEach(v => {
    if (v.next_service_date === d) {
      events.push({ type: "service", label: `Service: ${v.reg_number}`, color: "bg-red-500" });
    }
  });

  return events;
}

export default function CalendarWidget({ rentals, vehicles }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const paddingDays = Array(startOfMonth(currentMonth).getDay()).fill(null);

  // All events this month
  const monthEvents = days.flatMap(d => {
    const evts = getEvents(d, rentals, vehicles);
    return evts.map(e => ({ ...e, date: d }));
  });

  const selectedEvents = selectedDay ? getEvents(selectedDay, rentals, vehicles) : [];

  return (
    <div className="section-card shadow-sm" suppressHydrationWarning>
      <div className="section-card-header">
        <h3 className="section-card-title flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" /> Rental Calendar
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground w-32 text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        {/* Days grid — full size cells */}
        <div className="grid grid-cols-7 gap-1">
          {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
          {days.map((day) => {
            const events = getEvents(day, rentals, vehicles);
            const today = isToday(day);
            const selected = selectedDay && isSameDay(day, selectedDay);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                className={cn(
                  "flex flex-col items-center justify-start py-2 px-1 rounded-xl transition-all min-h-[58px] w-full border border-transparent",
                  today && !selected && "bg-blue-600 text-white shadow-sm",
                  selected && "bg-blue-50 dark:bg-blue-500/20 ring-2 ring-blue-300 dark:ring-blue-400/40 border-blue-100 dark:border-blue-400/40",
                  !today && !selected && "hover:bg-muted/60 hover:border-border",
                )}
              >
                <span className={cn("text-sm font-semibold", today && !selected ? "text-white" : "text-foreground")}>
                  {format(day, "d")}
                </span>
                {events.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                    {events.slice(0, 3).map((e, i) => (
                      <div key={i} className={cn("w-1.5 h-1.5 rounded-full", e.color, today && !selected && "opacity-70")} />
                    ))}
                    {events.length > 3 && <span className="text-[9px] text-muted-foreground">+{events.length - 3}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        {selectedDay && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {format(selectedDay, "EEEE, MMMM d")}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events on this day</p>
            ) : (
              <div className="space-y-1.5">
                {selectedEvents.map((e, i) => (
                  e.link ? (
                    <Link key={i} href={e.link} className="flex items-center gap-2 text-sm text-foreground hover:text-blue-600 transition-colors">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", e.color)} />
                      {e.label}
                    </Link>
                  ) : (
                    <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", e.color)} />
                      {e.label}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* Month event list */}
        {monthEvents.length > 0 && !selectedDay && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">This Month</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {monthEvents.map((e, i) => (
                e.link ? (
                  <Link key={i} href={e.link} className="flex items-center gap-2 text-sm text-foreground hover:text-blue-600 transition-colors">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", e.color)} />
                    <span className="text-muted-foreground text-xs w-10 flex-shrink-0">{format(e.date, "d MMM")}</span>
                    {e.label}
                  </Link>
                ) : (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", e.color)} />
                    <span className="text-muted-foreground text-xs w-10 flex-shrink-0">{format(e.date, "d MMM")}</span>
                    {e.label}
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border flex-wrap">
          {[
            { color: "bg-blue-500", label: "Return Due" },
            { color: "bg-amber-500", label: "Pickup" },
            { color: "bg-red-500", label: "Service Due" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", l.color)} />
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
