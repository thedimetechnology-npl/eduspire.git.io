import { useEffect, useState } from "react";
import {
  Plus, Video, Link2, Clock, Calendar, Bell, BookmarkCheck, Users, ExternalLink,
  Radio, ChevronRight, Search,
} from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge, Button, Input, Textarea, Select, EmptyState } from "../../components/ui/Kit";
import { Modal } from "../../components/ui/Modal";
import { formatDateTime, extractErrorMessage } from "../../utils/helpers";

const TABS = [
  { key: "all", label: "All Classes" },
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live Now" },
  { key: "completed", label: "Completed" },
];

export default function LiveClasses() {
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState(null);
  const [recordingLink, setRecordingLink] = useState("");
  const [form, setForm] = useState({
    course_id: "", title: "", description: "",
    scheduled_at: "", duration_minutes: 60, meeting_link: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const load = () =>
    client.get("/live-classes").then(({ data }) => setClasses(data));

  useEffect(() => {
    client.get("/courses", { params: { mine: true } }).then(({ data }) => setCourses(data));
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await client.post("/live-classes", {
        ...form,
        course_id: Number(form.course_id),
        duration_minutes: Number(form.duration_minutes),
      });
      setCreateOpen(false);
      setForm({
        course_id: "", title: "", description: "",
        scheduled_at: "", duration_minutes: 60, meeting_link: "",
      });
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveRecording = async () => {
    await client.put(`/live-classes/${recordingTarget.id}`, { recording_link: recordingLink });
    setRecordingTarget(null);
    load();
  };

  if (!classes) return <Spinner />;

  const now = new Date();
  const filtered = classes.filter((lc) => {
    const start = new Date(lc.scheduled_at);
    const end = new Date(start.getTime() + lc.duration_minutes * 60000);
    const isLive = start <= now && now <= end;
    const isPast = end < now;
    const isUpcoming = start > now;

    if (tab === "upcoming" && !isUpcoming) return false;
    if (tab === "live" && !isLive) return false;
    if (tab === "completed" && !isPast) return false;
    if (search && !lc.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: classes.length,
    upcoming: classes.filter((lc) => new Date(lc.scheduled_at) > now).length,
    live: classes.filter((lc) => {
      const start = new Date(lc.scheduled_at);
      const end = new Date(start.getTime() + lc.duration_minutes * 60000);
      return start <= now && now <= end;
    }).length,
    completed: classes.filter(
      (lc) => new Date(new Date(lc.scheduled_at).getTime() + lc.duration_minutes * 60000) < now
    ).length,
  };

  const todaySessions = classes.filter(
    (lc) => new Date(lc.scheduled_at).toDateString() === now.toDateString()
  );

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/liveclass-v2.png')",
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[#0a1e5e]">Live Classes</h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {classes.length} session{classes.length !== 1 ? "s" : ""} total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                  <Bell className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                  <BookmarkCheck className="w-4 h-4 text-gray-600" />
                </button>
                <Button
                  icon={Plus}
                  onClick={() => setCreateOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  Schedule
                </Button>
              </div>
            </div>

            {/* ============ Tabs + Search — frosted card ============ */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] p-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              {/* Tabs — single line, no wrap */}
              <div className="flex gap-1 bg-gray-50/80 rounded-xl p-1 overflow-x-auto scrollbar-thin">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      tab === t.key
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-white hover:text-blue-600"
                    }`}
                  >
                    {t.label}
                    {counts[t.key] > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          tab === t.key
                            ? "bg-white/25 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {counts[t.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative shrink-0 md:w-56">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search classes..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Class cards */}
            {filtered.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_15px_40px_-12px_rgba(30,64,175,0.15)]">
                <EmptyState
                  icon={Video}
                  title={tab === "all" ? "No live classes" : `No ${tab} classes`}
                  description="Schedule a session with a meeting link — Zoom, Meet, or any provider."
                />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.map((lc) => {
                  const start = new Date(lc.scheduled_at);
                  const end = new Date(start.getTime() + lc.duration_minutes * 60000);
                  const isLive = start <= now && now <= end;
                  const isPast = end < now;

                  const statusVariant = isLive ? "emerald" : isPast ? "neutral" : "gold";
                  const statusLabel = isLive ? "Live Now" : isPast ? "Completed" : "Upcoming";

                  return (
                    <div
                      key={lc.id}
                      className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.2)] transition-all flex flex-col"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                            isLive
                              ? "bg-rose-100"
                              : isPast
                              ? "bg-gray-100"
                              : "bg-blue-100"
                          }`}
                        >
                          {isLive ? (
                            <Radio className="w-5 h-5 text-rose-600 animate-pulse" />
                          ) : (
                            <Video className={`w-5 h-5 ${isPast ? "text-gray-500" : "text-blue-600"}`} />
                          )}
                        </div>
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </div>

                      {/* Title + meta */}
                      <h3 className="font-bold text-sm text-[#0a1e5e] leading-snug mb-1 line-clamp-2">
                        {lc.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3 truncate">
                        {lc.course_title}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-4">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateTime(lc.scheduled_at)} · {lc.duration_minutes} min
                      </p>

                      {/* ✅ Actions — anchors styled as buttons (no nested button-in-anchor) */}
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {lc.meeting_link && (
                          <a
                            href={lc.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                              isLive
                                ? "bg-rose-500 hover:bg-rose-600 text-white"
                                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {isLive ? "Join Now" : "Meeting Link"}
                          </a>
                        )}

                        {isPast && !lc.recording_link && (
                          <button
                            onClick={() => {
                              setRecordingTarget(lc);
                              setRecordingLink("");
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 border border-transparent transition-colors"
                          >
                            Add Recording
                          </button>
                        )}

                        {lc.recording_link && (
                          <a
                            href={lc.recording_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            Recording
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Today's sessions */}
            {todaySessions.length > 0 && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
                <h3 className="text-sm font-bold text-[#0a1e5e] mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" /> Today's Sessions
                </h3>
                <div className="space-y-3">
                  {todaySessions.map((lc) => (
                    <div key={lc.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{lc.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(lc.scheduled_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" · "}
                          {lc.duration_minutes} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== CREATE MODAL ==================== */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Schedule a live class">
        <form onSubmit={submit} className="space-y-4">
          <Select
            label="Course"
            required
            value={form.course_id}
            onChange={(e) => setForm({ ...form, course_id: e.target.value })}
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </Select>
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date & time"
              type="datetime-local"
              required
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            />
            <Input
              label="Duration (min)"
              type="number"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
            />
          </div>
          <Input
            label="Meeting link"
            placeholder="https://meet.google.com/..."
            value={form.meeting_link}
            onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            loading={saving}
          >
            Schedule class
          </Button>
        </form>
      </Modal>

      {/* ==================== RECORDING MODAL ==================== */}
      <Modal
        open={!!recordingTarget}
        onClose={() => setRecordingTarget(null)}
        title="Add recording link"
      >
        <div className="space-y-4">
          <Input
            label="Recording URL"
            placeholder="https://..."
            value={recordingLink}
            onChange={(e) => setRecordingLink(e.target.value)}
          />
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={saveRecording}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}