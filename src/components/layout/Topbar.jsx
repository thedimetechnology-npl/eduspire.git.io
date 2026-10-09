import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Bell, ChevronDown, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import client from "../../api/client";
import { initials, fromNow } from "../../utils/helpers";

// Complete icon map — matches backend notification types
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

export function Topbar({ onMenuClick, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timeout = setTimeout(() => {
      client.get("/search", { params: { q: query } }).then(({ data }) => setResults(data));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const loadNotifications = () => {
    client
      .get("/notifications/my")
      .then(({ data }) => setNotifications(data))
      .catch((err) => console.error("Failed to load notifications:", err));
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id) => {
    await client.patch(`/notifications/${id}/read`);
    loadNotifications();
  };

  const markAllRead = async () => {
    await client.patch("/notifications/read-all");
    loadNotifications();
  };

  const handleNotificationClick = (n) => {
    if (!n.is_read) markRead(n.id);

    const routes = {
      enrollment: "/student/my-courses",
      course_completed: "/student/certificates",
      payment: "/student/my-courses",
      payment_failed: "/student/catalog",
      refund: "/profile",
      assignment_new: "/student/assignments",
      assignment_graded: "/student/assignments",
      assignment_due: "/student/assignments",
      assignment_overdue: "/student/assignments",
      assignment_resubmitted: "/teacher/assignments",
      quiz_new: "/student/quizzes",
      quiz_result: "/student/quizzes",
      live_class: "/student/live-classes",
      live_class_starting: "/student/live-classes",
      live_class_started: "/student/live-classes",
      live_class_cancelled: "/student/live-classes",
      live_class_updated: "/student/live-classes",
      recording_available: "/student/live-classes",
      attendance: "/student/attendance",
      low_attendance: "/student/attendance",
      certificate: "/student/certificates",
      course_update: "/student/my-courses",
      new_course: "/student/catalog",
      new_lesson: "/student/my-courses",
      question_paper: "/student/question-papers",
      review_reminder: "/student/my-courses",
      message: "/messages",
      teacher_enrollment: "/teacher/students",
      teacher_submission: "/teacher/assignments",
      teacher_drop: "/teacher/students",
      teacher_review: "/teacher/courses",
      teacher_payment: "/teacher/dashboard",
      teacher_live_reminder: "/teacher/live-classes",
      admin_new_user: "/admin/users",
      admin_course_pending: "/admin/courses",
      admin_payment_issue: "/admin/payments",
      admin_alert: "/admin/dashboard",
    };

    const route = routes[n.type];
    if (route) {
      navigate(route);
      setNotifOpen(false);
    }
  };

  return (
    <header
      className="sticky top-0 z-20 h-16 text-white
                 bg-gradient-to-r from-[#0a1e5e] via-[#0d2a6e] to-[#1a3b8a]
                 border-b border-white/10
                 shadow-[0_4px_20px_-8px_rgba(10,30,94,0.6)]"
    >
      <div className="flex items-center gap-4 px-4 sm:px-6 h-16">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-white/90 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#e9c46a] font-semibold">
              Eduspire workspace
            </p>
            <h1 className="font-display text-lg font-semibold text-white">{title}</h1>
          </div>
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-full max-w-xs hidden sm:block" ref={searchRef}>
          <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowResults(true)}
            placeholder="Search courses, teachers..."
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl
                       bg-white/10 border border-white/15
                       text-sm text-white placeholder:text-white/50
                       focus:outline-none focus:bg-white/15
                       focus:border-[#e9c46a] focus:ring-2 focus:ring-[#e9c46a]/30
                       transition-all backdrop-blur-sm"
          />
          {showResults && results && (
            <div className="absolute mt-2 w-full bg-white rounded-xl border border-border shadow-[var(--shadow-pop)] overflow-hidden animate-fade-in text-ink">
              {[...(results.courses || []), ...(results.teachers || []), ...(results.students || [])].length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">No results for &quot;{query}&quot;</p>
              ) : (
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  {results.courses?.map((c) => (
                    <button
                      key={`c${c.id}`}
                      onClick={() => {
                        navigate(`/course/${c.id}`);
                        setShowResults(false);
                        setQuery("");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-paper text-sm flex items-center justify-between"
                    >
                      {c.title} <span className="text-xs text-muted">Course</span>
                    </button>
                  ))}
                  {results.teachers?.map((t) => (
                    <div
                      key={`t${t.id}`}
                      className="px-4 py-2.5 text-sm flex items-center justify-between text-muted"
                    >
                      {t.title} <span className="text-xs">Teacher</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              if (!notifOpen) loadNotifications();
            }}
            className="relative p-2.5 rounded-2xl text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-[#0a1e5e]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-white text-ink rounded-xl border border-border shadow-[var(--shadow-pop)] overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-sm text-ink">
                  Notifications{" "}
                  {unreadCount > 0 && (
                    <span className="text-blue-600">({unreadCount} new)</span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-gold-dark font-medium hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-3xl mb-2">🎉</p>
                    <p className="text-sm text-muted">You&apos;re all caught up.</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-border last:border-0 flex items-start gap-3 transition-colors hover:bg-paper ${
                        !n.is_read ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <span className="text-lg shrink-0 w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        {TYPE_ICONS[n.type] || "🔔"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            !n.is_read ? "font-semibold text-ink" : "font-medium text-text"
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-muted-light mt-1">
                          {fromNow(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    navigate("/notifications");
                    setNotifOpen(false);
                  }}
                  className="w-full text-center px-4 py-3 border-t border-border text-xs font-semibold text-blue-600 hover:bg-paper transition-colors"
                >
                  View all notifications →
                </button>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#e9c46a] text-[#0a1e5e] flex items-center justify-center text-xs font-semibold shrink-0 ring-2 ring-white/20">
              {initials(user?.full_name)}
            </div>
            <ChevronDown className="w-4 h-4 text-white/80 hidden sm:block" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white text-ink rounded-xl border border-border shadow-[var(--shadow-pop)] overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-ink truncate">{user?.full_name}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  navigate("/profile");
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-paper"
              >
                <UserIcon className="w-4 h-4" /> My Profile
              </button>
              <button
                onClick={() => {
                  navigate("/notifications");
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-paper"
              >
                <Bell className="w-4 h-4" /> All Notifications
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger-soft"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}