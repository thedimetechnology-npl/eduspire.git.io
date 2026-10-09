import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, GraduationCap, ClipboardList, FileQuestion, CalendarDays,
  Award, Users, MessagesSquare, Video, Settings, ShieldCheck, Receipt, BarChart3,
  FolderKanban, ScrollText, LogOut,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";

const NAV = {
  student: [
    { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/student/catalog", label: "Course Catalog", icon: BookOpen },
    { to: "/student/my-courses", label: "My Courses", icon: GraduationCap },
    { to: "/student/assignments", label: "Assignments", icon: ClipboardList },
    { to: "/student/quizzes", label: "Quizzes", icon: FileQuestion },
    { to: "/student/live-classes", label: "Live Classes", icon: Video },
    { to: "/student/attendance", label: "Attendance", icon: ShieldCheck },
    { to: "/student/certificates", label: "Certificates", icon: Award },
    { to: "/student/question-papers", label: "Question Papers", icon: ScrollText },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessagesSquare },
  ],
  teacher: [
    { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/teacher/courses", label: "My Courses", icon: BookOpen },
    { to: "/teacher/students", label: "Students", icon: Users },
    { to: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
    { to: "/teacher/quizzes", label: "Quizzes", icon: FileQuestion },
    { to: "/teacher/attendance", label: "Attendance", icon: ShieldCheck },
    { to: "/teacher/live-classes", label: "Live Classes", icon: Video },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessagesSquare },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/categories", label: "Categories", icon: FolderKanban },
    { to: "/admin/payments", label: "Payments", icon: Receipt },
    { to: "/admin/reports", label: "Reports & BI", icon: BarChart3 },
    { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

export function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const items = NAV[user?.role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-ink-dark/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-64 bg-ink text-white flex flex-col z-40 shrink-0
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* ==================== LOGO — fills the full rectangle ==================== */}
        {/* ==================== EDUSPIRE HEADER LOGO ==================== */}
        {/* ==================== EDUSPIRE LOGO ==================== */}
        <div className="h-16 w-full flex-shrink-0 bg-[#0a1e5e] flex items-center justify-center overflow-hidden">
          <img
            src="/logon.jpg"
            alt="EduSpire"
            className="w-full h-full object-contain"
          />
        </div>

        {/* ==================== NAVIGATION ==================== */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                  ? "bg-white text-ink shadow-lg shadow-black/10 translate-x-1"
                  : "text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-1"
                }`
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* ==================== LOGOUT ==================== */}
        <div className="px-3 pb-5 pt-2 border-t border-white/10 flex-shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}