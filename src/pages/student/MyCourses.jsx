import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap, PlayCircle, Search, LayoutGrid, List, Bell, BookmarkCheck, Clock,
} from "lucide-react";
import client from "../../api/client";
import { Spinner, Button, EmptyState } from "../../components/ui/Kit";

const TABS = [
  { key: "all", label: "All Courses" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "wishlist", label: "Wishlist" },
];

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");

  useEffect(() => {
    client.get("/my-courses").then(({ data }) => setEnrollments(data)).catch(() => setEnrollments([]));
  }, []);

  if (!enrollments) return <Spinner />;

  const filtered = enrollments.filter((e) => {
    if (tab === "in-progress" && e.status !== "active") return false;
    if (tab === "completed" && e.status !== "completed") return false;
    if (tab === "wishlist") return false;
    if (search && !e.course.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: enrollments.length,
    "in-progress": enrollments.filter((e) => e.status === "active").length,
    completed: enrollments.filter((e) => e.status === "completed").length,
    wishlist: 0,
  };

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/stcourse.png')",
        backgroundSize: "cover",
        backgroundPosition: "10%",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Content-side readability veil (darker) */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 via-white/50 to-white/90" />

      {/* ==================== CONTENT (kept at same position) ==================== */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">

          {/* MAIN CONTENT */}
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold text-[#0a1e5e]">My Courses</h1>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                  <Bell className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                  <BookmarkCheck className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            {/* Tabs + Search + View Toggle — now inside a frosted card */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] p-2 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

              {/* Tabs */}
              <div className="flex flex-wrap gap-1 bg-gray-50/80 rounded-xl p-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t.key
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-white hover:text-blue-600"
                      }`}
                  >
                    {t.label}
                    {counts[t.key] > 0 && (
                      <span
                        className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key
                            ? "bg-white/25 text-white"
                            : "bg-gray-200 text-gray-700"
                          }`}
                      >
                        {counts[t.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search + View Toggle */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full sm:w-56 pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setView(view === "grid" ? "list" : "grid")}
                  className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
                  aria-label="Toggle view"
                >
                  {view === "grid" ? (
                    <List className="w-4 h-4 text-gray-600" />
                  ) : (
                    <LayoutGrid className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Course Grid */}
            {filtered.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm">
                <EmptyState
                  icon={GraduationCap}
                  title={tab === "wishlist" ? "Wishlist is empty" : "No courses yet"}
                  description={
                    tab === "all"
                      ? "Browse the catalog to enroll in your first course."
                      : "You have no courses in this category yet."
                  }
                  action={
                    tab === "all" && (
                      <Link to="/student/catalog">
                        <Button>Browse catalog</Button>
                      </Link>
                    )
                  }
                />
              </div>
            ) : (
              <div
                className={
                  view === "grid"
                    ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "space-y-3"
                }
              >
                {filtered.map((e) => (
                  <CourseCard key={e.id} enrollment={e} view={view} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR — frosted glass so it stays readable over the image */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6 bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-[0_8px_30px_-12px_rgba(30,64,175,0.15)] border border-white/60">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  View all your enrolled courses, track progress, and continue learning at your pace.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Key Features
                </h3>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span> Grid &amp; list view
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span> Course progress
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span> Search &amp; filter
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span> Continue learning
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Navigation Flow
                </h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>My Courses →</li>
                  <li className="pl-3">Open Course →</li>
                  <li className="pl-6">Course Content</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ==================== COURSE CARD ====================
function CourseCard({ enrollment, view }) {
  const { course, progress_percent, status } = enrollment;
  const isCompleted = status === "completed";

  if (view === "list") {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-row overflow-hidden">
        <div className="w-48 shrink-0">
          <div className="h-full bg-gradient-to-br from-[#0a1e5e] to-[#1e40af] flex items-center justify-center">
            <PlayCircle className="w-10 h-10 text-white/50" />
          </div>
        </div>
        <div className="flex-1 p-4">
          <h3 className="font-semibold text-[#0a1e5e] text-sm mb-1">{course.title}</h3>
          <p className="text-[11px] text-gray-500 mb-3">{course.teacher_name}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${progress_percent}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-500">{progress_percent}%</span>
            <Link to={`/student/learn/${course.id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Continue
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link to={`/student/learn/${course.id}`}>
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.2)] transition-all flex flex-col h-full">
        {/* Thumbnail */}
        <div className="relative h-32 bg-gradient-to-br from-[#0a1e5e] via-[#1e3a8a] to-[#1e40af] flex items-center justify-center overflow-hidden">
          <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-blue-400/20" />
          <div className="absolute bottom-3 left-4 w-20 h-20 rounded-full bg-purple-400/20" />
          <PlayCircle className="w-11 h-11 text-white/50 relative z-10" />
          {isCompleted && (
            <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Completed
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-[#0a1e5e] text-sm leading-snug mb-1 line-clamp-2">
            {course.title}
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">{course.teacher_name}</p>

          {/* Progress */}
          <div className="mt-auto">
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {progress_percent}% Complete
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                style={{ width: `${progress_percent}%` }}
              />
            </div>

            <div className="w-full py-2 text-center text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition">
              {progress_percent > 0 ? "Continue Learning →" : "Start Learning →"}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}