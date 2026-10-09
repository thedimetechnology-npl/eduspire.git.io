import { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, Video, ClipboardList,
  FileQuestion, Clock, Search, Bell, BookmarkCheck,
} from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge, EmptyState } from "../../components/ui/Kit";
import { formatDateTime } from "../../utils/helpers";

const TYPE_CONFIG = {
  live_class: {
    icon: Video,
    label: "Live Class",
    bg: "bg-blue-100",
    textColor: "text-blue-700",
    dot: "bg-blue-500",
  },
  assignment_due: {
    icon: ClipboardList,
    label: "Assignment Due",
    bg: "bg-rose-100",
    textColor: "text-rose-700",
    dot: "bg-rose-500",
  },
  quiz: {
    icon: FileQuestion,
    label: "Quiz",
    bg: "bg-emerald-100",
    textColor: "text-emerald-700",
    dot: "bg-emerald-500",
  },
};

const TABS = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [events, setEvents] = useState(null);
  const [tab, setTab] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    client.get("/calendar")
      .then(({ data }) => setEvents(data))
      .catch(() => setEvents([]));
  }, []);

  if (!events) return <Spinner />;

  // Group events by date
  const eventsByDate = events.reduce((acc, e) => {
    const key = new Date(e.date).toISOString().split("T")[0];
    acc[key] = acc[key] || [];
    acc[key].push(e);
    return acc;
  }, {});

  // Month grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = new Date().toISOString().split("T")[0];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const todayEvents = eventsByDate[todayKey] || [];

  const upcomingEvents = [...events]
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/cal.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Right-side white gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/75 lg:to-white/90" />

      {/* ==================== CONTENT ==================== */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_1.35fr] gap-8">

          {/* LEFT SPACER — image shows through */}
          <div className="hidden lg:block" />

          {/* RIGHT SIDE */}
          <div className="lg:pl-4 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#0a1e5e]">Calendar</h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {events.length} event{events.length !== 1 ? "s" : ""} scheduled
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                  <Bell className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                  <BookmarkCheck className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Tabs + Today button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-3">
              <div className="flex flex-wrap gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                      tab === t.key
                        ? "text-blue-600 border-b-2 border-blue-600 -mb-[15px] pb-3"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                onClick={goToday}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Go to Today
              </button>
            </div>

            {/* Calendar card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-[0_15px_40px_-12px_rgba(30,64,175,0.15)] overflow-hidden">
              {/* Month header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <h2 className="font-bold text-[#0a1e5e] text-lg">
                  {MONTHS[month]} {year}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {cells.map((date, i) => {
                  if (!date) {
                    return (
                      <div
                        key={i}
                        className="min-h-[80px] border-r border-b border-gray-100"
                      />
                    );
                  }

                  const key = date.toISOString().split("T")[0];
                  const dayEvents = eventsByDate[key] || [];
                  const isToday = key === todayKey;

                  return (
                    <div
                      key={i}
                      className={`min-h-[80px] p-2 border-r border-b border-gray-100 transition hover:bg-blue-50/50 ${
                        isToday ? "bg-blue-100/60" : ""
                      }`}
                    >
                      <div
                        className={`text-xs font-bold mb-1 ${
                          isToday ? "text-blue-600" : "text-gray-700"
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((e, idx) => {
                          const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.quiz;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${cfg.bg} ${cfg.textColor}`}
                              title={e.title}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                              <span className="truncate">{e.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-gray-500 px-1.5 font-medium">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              ))}
            </div>

            {/* Today's Schedule + Upcoming — two-column at bottom */}
            <div className="grid sm:grid-cols-2 gap-4">

              {/* Today's schedule */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
                <h3 className="text-sm font-bold text-[#0a1e5e] mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" /> Today's Schedule
                </h3>
                {todayEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    Nothing scheduled today.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todayEvents.slice(0, 4).map((e, i) => {
                      const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.quiz;
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.textColor} flex items-center justify-center shrink-0`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {e.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(e.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
                <h3 className="text-sm font-bold text-[#0a1e5e] mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-600" /> Upcoming
                </h3>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No upcoming events.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((e, i) => {
                      const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.quiz;
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.textColor} flex items-center justify-center shrink-0`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {e.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(e.date)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}