import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, BookOpen, ClipboardCheck, Star, Video, DollarSign, TrendingUp,
  Calendar, BarChart3, FileText, ChevronRight, Award,
} from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Button } from "../../components/ui/Kit";
import { useAuth } from "../../context/useAuth";
import { formatCurrency } from "../../utils/helpers";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/dashboard/teacher")
      .then(({ data }) => setData(data))
      .catch((err) => console.error("Failed to load dashboard:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <div className="text-center py-12 text-gray-500">No data available</div>;

  // ==================== STATS ====================
  const stats = [
    {
      label: "Courses",
      value: `${data.published_courses ?? 0}/${data.total_courses ?? 0}`,
      sub: "published / total",
      icon: BookOpen,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Students",
      value: data.total_students ?? 0,
      sub: "active enrollments",
      icon: Users,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "To grade",
      value: data.pending_submissions ?? 0,
      sub: "pending submissions",
      icon: ClipboardCheck,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Earnings",
      value: formatCurrency(data.earnings_total ?? 0),
      sub: "lifetime total",
      icon: DollarSign,
      color: "bg-rose-100 text-rose-600",
    },
  ];

  // ==================== SECTIONS ====================
  const today = data.today_schedule ?? [];
  const performance = data.student_performance ?? [];
  const recentAssignments = data.recent_assignments ?? [];
  const upcomingClasses = data.upcoming_classes ?? [];
  const activity = data.recent_activity ?? [];

  const activityIcon = {
    submission: "📝",
    enrollment: "👥",
    message: "💬",
    grade: "✅",
  };

  const maxPerformance = Math.max(...performance.map((p) => p.value), 100);

  return (
    <div className="space-y-6">

      {/* ==================== HERO BANNER ==================== */}
      <div className="relative bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-100 rounded-3xl p-6 md:p-8 overflow-hidden border border-blue-100">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold text-blue-700 mb-1">Welcome Back,</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0a1e5e] mb-2">
            {user?.full_name || "Teacher"} 👋
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Inspire. Teach. Make a Difference.
          </p>
        </div>

        <div className="absolute right-0 bottom-0 top-0 w-40 md:w-72 hidden md:flex items-center justify-center">
          <div className="text-8xl md:text-9xl">👩‍🏫</div>
        </div>

        <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/40 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-16 left-1/3 w-40 h-40 bg-blue-200/40 rounded-full blur-2xl"></div>
      </div>

      {/* ==================== STATS ROW ==================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-[#0a1e5e] mb-1">{stat.value}</p>
              <p className="text-[11px] text-gray-400">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ==================== SCHEDULE + PERFORMANCE ==================== */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Today's Schedule */}
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-sm text-[#0a1e5e] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" /> Today's Schedule
            </h3>
            <Link to="/calendar" className="text-xs font-semibold text-blue-600 hover:underline">
              View Calendar
            </Link>
          </div>
          {today.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">Nothing scheduled today.</p>
          ) : (
            <div className="p-5 space-y-4">
              {today.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-4 pl-4 border-l-2 ${
                    item.kind === "live_class" ? "border-l-blue-500" : "border-l-orange-500"
                  }`}
                >
                  <div className="w-20 shrink-0">
                    <p className="text-xs font-bold text-[#0a1e5e]">{item.time}</p>
                    {item.end && <p className="text-[10px] text-gray-400">{item.end}</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.type}</p>
                  </div>
                  {item.kind === "live_class" && (
                    <Link to="/teacher/live-classes" className="shrink-0">
                      <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                        <Video className="w-3 h-3" /> Join
                      </button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Student Performance */}
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-sm text-[#0a1e5e] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Student Performance
            </h3>
          </div>
          {performance.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No quiz data yet.</p>
          ) : (
            <div className="p-5">
              <div className="flex items-end justify-around gap-3 h-48">
                {performance.map((p, i) => {
                  const heightPct = (p.value / maxPerformance) * 100;
                  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#ec4899", "#06b6d4"];
                  return (
                    <div key={i} className="flex flex-col items-center justify-end h-full w-full max-w-[50px]">
                      <span className="text-[10px] font-semibold text-gray-600 mb-1">
                        {p.value}%
                      </span>
                      <div
                        className="w-full rounded-t-lg transition-all hover:opacity-80"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: colors[i % colors.length],
                          minHeight: "20px",
                        }}
                        title={`${p.label}: ${p.value}%`}
                      />
                      <span className="text-[10px] text-gray-500 mt-2 text-center line-clamp-2">
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ==================== RECENT ASSIGNMENTS + RIGHT SIDEBAR ==================== */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Assignments */}
        <Card padded={false} className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-sm text-[#0a1e5e] flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-blue-600" /> Recent Assignments
            </h3>
            <Link to="/teacher/assignments" className="text-xs font-semibold text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          {recentAssignments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No assignments yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.title}</p>
                    <p className="text-xs text-gray-500">
                      {a.course_title}
                      {a.due_date && ` · Due ${new Date(a.due_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#0a1e5e]">{a.submissions}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Submissions</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">

          {/* Upcoming Classes */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-xs text-[#0a1e5e] flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Upcoming Classes
              </h3>
              <Link to="/teacher/live-classes" className="text-[10px] font-semibold text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            {upcomingClasses.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No upcoming classes.</p>
            ) : (
              <div className="p-3 space-y-3">
                {upcomingClasses.map((c) => {
                  const dt = new Date(c.scheduled_at);
                  const month = dt.toLocaleString("en", { month: "short" }).toUpperCase();
                  const day = dt.getDate();
                  return (
                    <Link
                      key={c.id}
                      to="/teacher/live-classes"
                      className="flex items-start gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition"
                    >
                      <div className="w-11 h-11 rounded-lg bg-blue-50 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-blue-600 uppercase">{month}</span>
                        <span className="text-sm font-bold text-[#0a1e5e]">{day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{c.title}</p>
                        <p className="text-[10px] text-gray-500">
                          {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {c.duration_minutes} min
                        </p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          {c.course_title || "Live Class"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent Activity */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-xs text-[#0a1e5e] flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-blue-600" /> Recent Activity
              </h3>
              <Link to="/notifications" className="text-[10px] font-semibold text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            {activity.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No recent activity.</p>
            ) : (
              <div className="p-3 space-y-2">
                {activity.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50"
                  >
                    <span className="text-base shrink-0">{activityIcon[a.kind] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-700 leading-tight">{a.text}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {a.at
                          ? new Date(a.at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ==================== AVERAGE RATING + QUICK ACTIONS ==================== */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xl text-[#0a1e5e]">{data.average_rating || "—"}</p>
              <p className="text-xs text-gray-500">Average rating</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xl text-[#0a1e5e]">
                {data.upcoming_live_classes ?? 0}
              </p>
              <p className="text-xs text-gray-500">Upcoming live classes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xl text-[#0a1e5e]">{data.total_students ?? 0}</p>
              <p className="text-xs text-gray-500">Total students</p>
            </div>
          </div>

          <Link to="/teacher/courses/new">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Create a new course
            </Button>
          </Link>
        </Card>

        {/* Students per course chart */}
        <div className="lg:col-span-2">
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-sm text-[#0a1e5e] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Enrollment by Course
              </h3>
            </div>
            {!data.students_per_course || data.students_per_course.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No enrollment data yet.</p>
            ) : (
              <div className="p-5">
                <div className="space-y-3">
                  {data.students_per_course.map((c, i) => {
                    const max = Math.max(...data.students_per_course.map((x) => x.value), 1);
                    const pct = (c.value / max) * 100;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-700 font-medium truncate">{c.label}</span>
                          <span className="text-[#0a1e5e] font-bold">{c.value}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}