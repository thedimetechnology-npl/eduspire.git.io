import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { VerificationBanner } from "./VerificationBanner";

const TITLES = {
  "/student/dashboard": "Dashboard",
  "/student/catalog": "Course Catalog",
  "/student/my-courses": "My Courses",
  "/student/assignments": "Assignments",
  "/student/quizzes": "Quizzes",
  "/student/attendance": "Attendance",
  "/student/certificates": "Certificates",
  "/student/question-papers": "Question Papers",
  "/teacher/dashboard": "Dashboard",
  "/teacher/courses": "My Courses",
  "/teacher/students": "Students",
  "/teacher/assignments": "Assignments",
  "/teacher/quizzes": "Quizzes",
  "/teacher/attendance": "Attendance",
  "/teacher/live-classes": "Live Classes",
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Users",
  "/admin/courses": "Courses",
  "/admin/categories": "Categories",
  "/admin/payments": "Payments",
  "/admin/reports": "Reports & BI",
  "/admin/audit-logs": "Audit Logs",
  "/admin/settings": "Settings",
  "/notifications": "Notifications",
  "/profile": "My Profile",
  "/calendar": "Calendar",
  "/messages": "Messages",
};

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const title = TITLES[pathname] || "";

  return (
    <div className="min-h-screen flex bg-[#f5f7fb] relative">
      {/* ==================== BACKGROUND DECORATION ==================== */}
      {/* Soft gradient canvas */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-indigo-50/40 z-0" />

      {/* Large soft circles in the corners */}
      <div className="pointer-events-none fixed -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-3xl z-0" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-3xl z-0" />

      {/* Small dotted pattern in the middle-right */}
      <div className="pointer-events-none fixed top-1/3 right-10 w-32 h-32 opacity-20 z-0"
        style={{
          backgroundImage: "radial-gradient(circle, #2563eb 1.5px, transparent 1.5px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* Thin gold ring (top right) — matches your original design */}
      <div className="pointer-events-none fixed -right-32 top-24 h-80 w-80 rounded-full border-[36px] border-gold/5 z-0" />
      <div className="pointer-events-none fixed right-10 top-40 h-3 w-3 rounded-full bg-gold/30 z-0" />

      {/* ==================== MAIN LAYOUT ==================== */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <VerificationBanner />
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="relative flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}