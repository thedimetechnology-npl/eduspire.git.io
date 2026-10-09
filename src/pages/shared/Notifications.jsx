import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, BellRing, Bookmark } from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Button, EmptyState } from "../../components/ui/Kit";
import { fromNow } from "../../utils/helpers";

// Same icon map as Topbar — keeps things consistent
const TYPE_ICONS = {
  enrollment: "🎓",
  course_completed: "🏁",
  payment: "💳",
  payment_failed: "❌",
  refund: "💰",
  assignment_new: "📝",
  assignment_graded: "✅",
  assignment_due: "⏰",
  assignment_overdue: "⚠️",
  assignment_resubmitted: "🔄",
  quiz_new: "🧠",
  quiz_result: "📊",
  live_class: "🎥",
  live_class_starting: "🔔",
  live_class_started: "🔴",
  live_class_cancelled: "❌",
  live_class_updated: "🔄",
  recording_available: "📹",
  attendance: "🗓️",
  low_attendance: "⚠️",
  certificate: "🏅",
  course_update: "📢",
  new_course: "🆕",
  new_lesson: "📚",
  question_paper: "📄",
  review_reminder: "⭐",
  message: "💬",
  teacher_enrollment: "🎓",
  teacher_submission: "📥",
  teacher_drop: "🚪",
  teacher_review: "⭐",
  teacher_payment: "💵",
  teacher_live_reminder: "⏰",
  admin_new_user: "👤",
  admin_course_pending: "📋",
  admin_payment_issue: "⚠️",
  admin_alert: "🚨",
};

// Route map for click-through
const TYPE_ROUTES = {
  enrollment: "/student/my-courses",
  course_completed: "/student/certificates",
  payment: "/student/my-courses",
  assignment_new: "/student/assignments",
  assignment_graded: "/student/assignments",
  quiz_new: "/student/quizzes",
  quiz_result: "/student/quizzes",
  live_class: "/student/live-classes",
  live_class_starting: "/student/live-classes",
  live_class_started: "/student/live-classes",
  attendance: "/student/attendance",
  certificate: "/student/certificates",
  course_update: "/student/my-courses",
  new_course: "/student/catalog",
  new_lesson: "/student/my-courses",
  question_paper: "/student/question-papers",
  message: "/messages",
  teacher_enrollment: "/teacher/students",
  teacher_submission: "/teacher/assignments",
  teacher_live_reminder: "/teacher/live-classes",
  admin_new_user: "/admin/users",
  admin_course_pending: "/admin/courses",
  admin_payment_issue: "/admin/payments",
};

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(null);
  const [tab, setTab] = useState("all");

  // ✅ Fixed: proper async fetch inside useEffect
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await client.get("/notifications/my");
        if (!cancelled) setNotifications(data);
      } catch (err) {
        console.error("Failed to load notifications:", err);
        if (!cancelled) setNotifications([]);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const refresh = async () => {
    try {
      const { data } = await client.get("/notifications/my");
      setNotifications(data);
    } catch (err) {
      console.error("Failed to refresh notifications:", err);
    }
  };

  const markRead = async (id) => {
    await client.patch(`/notifications/${id}/read`);
    refresh();
  };

  const markAllRead = async () => {
    await client.patch("/notifications/read-all");
    refresh();
  };

  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id);
    const route = TYPE_ROUTES[n.type];
    if (route) navigate(route);
  };

  if (!notifications) return <Spinner />;

  const filtered = notifications.filter((n) => {
    if (tab === "unread" && n.is_read) return false;
    if (tab === "read" && !n.is_read) return false;
    return true;
  });

  const counts = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.is_read).length,
    read: notifications.filter((n) => n.is_read).length,
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* MAIN COLUMN */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-[#0a1e5e]">Notifications</h1>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition">
              <Bell className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition">
              <Bookmark className="w-4 h-4 text-gray-600" />
            </button>
            {counts.unread > 0 && (
              <Button size="sm" variant="outline" icon={CheckCheck} onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-5 border-b border-gray-200 pb-3">
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
              {counts[t.key] > 0 && (
                <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={tab === "all" ? "No notifications" : `No ${tab} notifications`}
            description={tab === "all" ? "You're all caught up." : `You have no ${tab} notifications.`}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <Card
                key={n.id}
                onClick={() => handleClick(n)}
                className={`cursor-pointer flex items-start gap-3 transition-all hover:shadow-md ${
                  !n.is_read ? "border-blue-200 bg-blue-50/40" : "border-gray-100"
                }`}
              >
                <span className="text-xl shrink-0 w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  {TYPE_ICONS[n.type] || "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? "font-semibold text-[#0a1e5e]" : "font-medium text-gray-700"}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{fromNow(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <aside className="hidden lg:block space-y-6">
        <Card>
          <h3 className="text-sm font-bold text-[#0a1e5e] mb-4 flex items-center gap-2">
            <BellRing className="w-4 h-4 text-blue-600" /> Summary
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-sm font-semibold text-[#0a1e5e]">{counts.all}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Unread</span>
              <span className="text-sm font-semibold text-blue-600">{counts.unread}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Read</span>
              <span className="text-sm font-semibold text-gray-400">{counts.read}</span>
            </div>
          </div>
        </Card>

        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Stay updated with all your activity — enrollments, graded assignments,
            live classes, certificates and messages.
          </p>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-4">Key Features</h3>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Real-time updates</li>
            <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Unread indicator</li>
            <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Mark as read</li>
            <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Click to navigate</li>
            <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Filter by status</li>
          </ul>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-4">Navigation Flow</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>Notifications →</li>
            <li className="pl-3">Click to open →</li>
            <li className="pl-6">View details</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}