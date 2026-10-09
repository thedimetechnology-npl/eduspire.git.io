import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Spinner } from "./components/ui/Kit";
import { DashboardLayout } from "./components/layout/DashboardLayout";

const LandingPage = lazy(() => import("./pages/landing/LandingPage"));

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));

const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const CourseCatalog = lazy(() => import("./pages/student/CourseCatalog"));
const CourseDetail = lazy(() => import("./pages/student/CourseDetail"));
const PaymentSuccess = lazy(() => import("./pages/student/PaymentSuccess"));
const MyCourses = lazy(() => import("./pages/student/MyCourses"));
const CoursePlayer = lazy(() => import("./pages/student/CoursePlayer"));
const StudentAssignments = lazy(() => import("./pages/student/StudentAssignments"));
const StudentQuizzes = lazy(() => import("./pages/student/StudentQuizzes"));
const QuizAttempt = lazy(() => import("./pages/student/QuizAttempt"));
const StudentCertificates = lazy(() => import("./pages/student/StudentCertificates"));
const StudentAttendance = lazy(() => import("./pages/student/StudentAttendance"));
const QuestionPapers = lazy(() => import("./pages/student/QuestionPapers"));
const StudentLiveClasses = lazy(() => import("./pages/student/StudentLiveClasses")); // ← NEW

const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherCourses = lazy(() => import("./pages/teacher/TeacherCourses"));
const CourseBuilder = lazy(() => import("./pages/teacher/CourseBuilder"));
const TeacherStudents = lazy(() => import("./pages/teacher/TeacherStudents"));
const TeacherAssignments = lazy(() => import("./pages/teacher/TeacherAssignments"));
const TeacherQuizzes = lazy(() => import("./pages/teacher/TeacherQuizzes"));
const TeacherAttendance = lazy(() => import("./pages/teacher/TeacherAttendance"));
const LiveClasses = lazy(() => import("./pages/teacher/LiveClasses"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const ManageCourses = lazy(() => import("./pages/admin/ManageCourses"));
const Categories = lazy(() => import("./pages/admin/Categories"));
const Payments = lazy(() => import("./pages/admin/Payments"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings"));

const Notifications = lazy(() => import("./pages/shared/Notifications"));
const Profile = lazy(() => import("./pages/shared/Profile"));
const CalendarPage = lazy(() => import("./pages/shared/Calendar"));
const Messages = lazy(() => import("./pages/shared/Messages"));
const VerifyCertificate = lazy(() => import("./pages/shared/VerifyCertificate"));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <Spinner />
    </div>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

function DashboardShell() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify/:certificateNumber" element={<VerifyCertificate />} />

            {/* ============ PROTECTED ROUTES WRAPPED IN DASHBOARD LAYOUT ============ */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardShell />
                </ProtectedRoute>
              }
            >
              {/* Student */}
              <Route path="/student/dashboard" element={<ProtectedRoute roles={["student"]}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/student/catalog" element={<ProtectedRoute roles={["student"]}><CourseCatalog /></ProtectedRoute>} />
              <Route path="/course/:id" element={<CourseDetail />} />
              <Route path="/payment-success" element={<ProtectedRoute roles={["student"]}><PaymentSuccess /></ProtectedRoute>} />
              <Route path="/student/my-courses" element={<ProtectedRoute roles={["student"]}><MyCourses /></ProtectedRoute>} />
              <Route path="/student/learn/:id" element={<ProtectedRoute roles={["student"]}><CoursePlayer /></ProtectedRoute>} />
              <Route path="/student/assignments" element={<ProtectedRoute roles={["student"]}><StudentAssignments /></ProtectedRoute>} />
              <Route path="/student/quizzes" element={<ProtectedRoute roles={["student"]}><StudentQuizzes /></ProtectedRoute>} />
              <Route path="/student/quizzes/:quizId/attempt/:attemptId" element={<ProtectedRoute roles={["student"]}><QuizAttempt /></ProtectedRoute>} />
              <Route path="/student/live-classes" element={<ProtectedRoute roles={["student"]}><StudentLiveClasses /></ProtectedRoute>} />
              <Route path="/student/certificates" element={<ProtectedRoute roles={["student"]}><StudentCertificates /></ProtectedRoute>} />
              <Route path="/student/attendance" element={<ProtectedRoute roles={["student"]}><StudentAttendance /></ProtectedRoute>} />
              <Route path="/student/question-papers" element={<ProtectedRoute roles={["student"]}><QuestionPapers /></ProtectedRoute>} />

              {/* Teacher */}
              <Route path="/teacher/dashboard" element={<ProtectedRoute roles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/teacher/courses" element={<ProtectedRoute roles={["teacher"]}><TeacherCourses /></ProtectedRoute>} />
              <Route path="/teacher/courses/new" element={<ProtectedRoute roles={["teacher"]}><CourseBuilder /></ProtectedRoute>} />
              <Route path="/teacher/courses/:id/edit" element={<ProtectedRoute roles={["teacher"]}><CourseBuilder /></ProtectedRoute>} />
              <Route path="/teacher/students" element={<ProtectedRoute roles={["teacher"]}><TeacherStudents /></ProtectedRoute>} />
              <Route path="/teacher/assignments" element={<ProtectedRoute roles={["teacher"]}><TeacherAssignments /></ProtectedRoute>} />
              <Route path="/teacher/quizzes" element={<ProtectedRoute roles={["teacher"]}><TeacherQuizzes /></ProtectedRoute>} />
              <Route path="/teacher/attendance" element={<ProtectedRoute roles={["teacher"]}><TeacherAttendance /></ProtectedRoute>} />
              <Route path="/teacher/live-classes" element={<ProtectedRoute roles={["teacher"]}><LiveClasses /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin/dashboard" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute roles={["admin"]}><ManageUsers /></ProtectedRoute>} />
              <Route path="/admin/courses" element={<ProtectedRoute roles={["admin"]}><ManageCourses /></ProtectedRoute>} />
              <Route path="/admin/categories" element={<ProtectedRoute roles={["admin"]}><Categories /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute roles={["admin"]}><Payments /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute roles={["admin"]}><Reports /></ProtectedRoute>} />
              <Route path="/admin/audit-logs" element={<ProtectedRoute roles={["admin"]}><AuditLogs /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute roles={["admin"]}><SystemSettings /></ProtectedRoute>} />

              {/* Shared */}
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}