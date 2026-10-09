import { useEffect, useState } from "react";
import {
  Video, Clock, ExternalLink, Calendar as CalendarIcon, Bell, BookmarkCheck,
  Search, Radio, CheckCircle2, PlayCircle, Users,
} from "lucide-react";
import client from "../../api/client";
import { Spinner, Badge, Button, EmptyState } from "../../components/ui/Kit";
import { formatDateTime } from "../../utils/helpers";

const TABS = [
  { key: "all", label: "All Classes" },
  { key: "live", label: "Live Now" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

export default function StudentLiveClasses() {
  const [classes, setClasses] = useState(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    client.get("/my-courses")
      .then(async ({ data: enrollments }) => {
        const lists = await Promise.all(
          enrollments.map((e) =>
            client.get("/live-classes", { params: { course_id: e.course.id } })
              .then((r) => r.data)
              .catch(() => [])
          )
        );
        setClasses(lists.flat());
      })
      .catch(() => setClasses([]));
  }, []);

  if (!classes) return <Spinner />;

  const now = new Date();

  const filtered = classes.filter((lc) => {
    const start = new Date(lc.scheduled_at);
    const end = new Date(start.getTime() + lc.duration_minutes * 60000);
    const isLive = start <= now && now <= end;
    const isPast = end < now;
    const isUpcoming = start > now;

    if (tab === "live" && !isLive) return false;
    if (tab === "upcoming" && !isUpcoming) return false;
    if (tab === "completed" && !isPast) return false;
    if (search && !lc.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: classes.length,
    live: classes.filter((lc) => {
      const s = new Date(lc.scheduled_at);
      const e = new Date(s.getTime() + lc.duration_minutes * 60000);
      return s <= now && now <= e;
    }).length,
    upcoming: classes.filter((lc) => new Date(lc.scheduled_at) > now).length,
    completed: classes.filter((lc) => {
      const s = new Date(lc.scheduled_at);
      const e = new Date(s.getTime() + lc.duration_minutes * 60000);
      return e < now;
    }).length,
  };

  const todayEvents = classes
    .filter((lc) => new Date(lc.scheduled_at).toDateString() === now.toDateString())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const upcomingEvents = classes
    .filter((lc) => new Date(lc.scheduled_at) > now)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 4);

  return (
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/stuclass.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="grid lg:grid-cols-[300px_1fr] gap-8 items-start">

          {/* LEFT BRANDING PANEL */}
          <div className="hidden lg:block space-y-6 pt-2">
            <div>
              <img src="/logon.jpg" alt="EduSpire" className="h-12 w-auto object-contain mb-6" />
              <h1 className="text-3xl font-bold text-[#0a1e5e] leading-tight mb-2">
                Live Classes
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                Join interactive live sessions, ask questions, and learn from the best.
              </p>
            </div>

            <p className="text-2xl text-blue-600 italic font-serif -rotate-2 leading-tight">
              "Learn Together<br />Grow Further"
            </p>

            <div className="space-y-3 pt-4">
              {[
                { icon: "👥", text: "Live Interaction" },
                { icon: "💬", text: "Ask Questions" },
                { icon: "📚", text: "Learn Together" },
                { icon: "📈", text: "Grow Your Skills" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-base">
                    {f.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT MAIN CONTENT */}
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0a1e5e]">Your Live Classes</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {classes.length} class{classes.length !== 1 ? "es" : ""} scheduled
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-white/90 hover:bg-white transition shadow-sm">
                  <Bell className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 rounded-lg bg-white/90 hover:bg-white transition shadow-sm">
                  <BookmarkCheck className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Tabs + Search */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      tab === t.key
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                    }`}
                  >
                    {t.label}
                    {counts[t.key] > 0 && (
                      <span
                        className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                          tab === t.key
                            ? "bg-white/25 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {counts[t.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search classes..."
                  className="w-full sm:w-56 pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Class cards */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm">
                <EmptyState
                  icon={Video}
                  title={tab === "all" ? "No live classes" : `No ${tab} classes`}
                  description="Live classes from your enrolled courses will appear here."
                />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.map((lc) => {
                  const start = new Date(lc.scheduled_at);
                  const end = new Date(start.getTime() + lc.duration_minutes * 60000);
                  const isLive = start <= now && now <= end;
                  const isPast = end < now;

                  return (
                    <div
                      key={lc.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.2)] transition-all flex flex-col overflow-hidden"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-32 bg-gradient-to-br from-[#0a1e5e] via-[#1e3a8a] to-[#1e40af] flex items-center justify-center overflow-hidden">
                        <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-blue-400/20" />
                        <div className="absolute bottom-2 left-4 w-16 h-16 rounded-full bg-purple-400/20" />

                        {isLive ? (
                          <div className="relative z-10 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wide">
                              Live Now
                            </span>
                          </div>
                        ) : isPast ? (
                          <CheckCircle2 className="w-10 h-10 text-white/40 relative z-10" />
                        ) : (
                          <Video className="w-10 h-10 text-white/40 relative z-10" />
                        )}

                        <div className="absolute top-3 left-3">
                          <Badge variant={isLive ? "emerald" : isPast ? "neutral" : "gold"}>
                            {isLive ? "Live" : isPast ? "Completed" : "Upcoming"}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-sm text-[#0a1e5e] leading-snug mb-1 line-clamp-2">
                          {lc.title}
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">{lc.course_title}</p>

                        <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                          <p className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {formatDateTime(lc.scheduled_at)}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {lc.duration_minutes} minutes
                          </p>
                        </div>

                        {/* ✅ FIXED ACTION BLOCK — anchors styled as buttons */}
                        <div className="mt-auto flex flex-wrap gap-2">
                          {isLive && lc.meeting_link && (
                            <a
                              href={lc.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                                         bg-red-500 hover:bg-red-600 text-white text-sm font-semibold
                                         transition-colors"
                            >
                              <Video className="w-4 h-4" />
                              Join Now
                            </a>
                          )}

                          {!isLive && !isPast && lc.meeting_link && (
                            <a
                              href={lc.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                                         border border-blue-600 text-blue-600 hover:bg-blue-50
                                         text-sm font-semibold transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Meeting Link
                            </a>
                          )}

                          {isPast && lc.recording_link && (
                            <a
                              href={lc.recording_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                                         bg-[#e9c46a] hover:bg-[#d8b25a] text-[#0a1e5e]
                                         text-sm font-semibold transition-colors"
                            >
                              <PlayCircle className="w-4 h-4" />
                              Watch Recording
                            </a>
                          )}

                          {isPast && !lc.recording_link && (
                            <p className="text-xs text-gray-400 italic">
                              Recording not available yet
                            </p>
                          )}

                          {!isLive && !isPast && !lc.meeting_link && (
                            <p className="text-xs text-gray-400 italic">
                              Meeting link will appear here
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Today's Schedule + Upcoming */}
            {(todayEvents.length > 0 || upcomingEvents.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
                  <h3 className="text-sm font-bold text-[#0a1e5e] mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> Today's Schedule
                  </h3>
                  {todayEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No sessions today.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {todayEvents.map((lc) => {
                        const start = new Date(lc.scheduled_at);
                        const end = new Date(
                          start.getTime() + lc.duration_minutes * 60000
                        );
                        const isLive = start <= now && now <= end;
                        return (
                          <div key={lc.id} className="flex items-start gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isLive
                                  ? "bg-red-100 text-red-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {isLive ? (
                                <Radio className="w-4 h-4" />
                              ) : (
                                <Video className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {lc.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {start.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {isLive && (
                                  <span className="text-red-600 font-semibold ml-2">
                                    • Live
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
                  <h3 className="text-sm font-bold text-[#0a1e5e] mb-4 flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" /> Upcoming Classes
                  </h3>
                  {upcomingEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No upcoming classes.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingEvents.map((lc) => (
                        <div key={lc.id} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {lc.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(lc.scheduled_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}