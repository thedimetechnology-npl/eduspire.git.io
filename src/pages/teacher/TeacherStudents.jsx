import { useEffect, useState } from "react";
import { Users, Search, GraduationCap } from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge, Select, EmptyState } from "../../components/ui/Kit";
import { ProgressRing } from "../../components/ui/Seal";
import { initials, formatDate } from "../../utils/helpers";

export default function TeacherStudents() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [roster, setRoster] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    client.get("/courses", { params: { mine: true } }).then(({ data }) => {
      setCourses(data);
      if (data.length > 0) setCourseId(String(data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setRoster(null);
    client.get(`/courses/${courseId}/students`).then(({ data }) => setRoster(data));
  }, [courseId]);

  const selectedCourse = courses.find((c) => String(c.id) === String(courseId));

  const filtered = (roster ?? []).filter((e) =>
    (e.student_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/student.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay for readability on the right side */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/75 lg:to-white/90" />

      {/* ==================== CONTENT ==================== */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">

          {/* LEFT SPACER — the image shows through here */}
          <div className="hidden lg:block" />

          {/* RIGHT SIDE — Roster */}
          <div className="lg:pl-4">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h1 className="text-2xl font-bold text-[#0a1e5e]">Students</h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {roster
                    ? `${filtered.length} student${filtered.length !== 1 ? "s" : ""} enrolled`
                    : "Loading roster..."}
                </p>
              </div>

              {/* Course selector */}
              {courses.length > 0 && (
                <Select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full sm:w-64"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-5 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-sm"
              />
            </div>

            {/* Roster */}
            {!roster ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <div className="py-16 flex justify-center">
                  <Spinner />
                </div>
              </Card>
            ) : roster.length === 0 ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <EmptyState
                  icon={Users}
                  title="No students enrolled yet"
                  description="Once students enroll in this course, they'll show up here."
                />
              </Card>
            ) : filtered.length === 0 ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <EmptyState
                  icon={Search}
                  title="No matches"
                  description={`No student matches "${search}"`}
                />
              </Card>
            ) : (
              <Card
                padded={false}
                className="bg-white/95 backdrop-blur-sm shadow-[0_15px_40px_-12px_rgba(30,64,175,0.15)] overflow-hidden"
              >
                {/* Header row */}
                <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50/60">
                  <span className="w-8" />
                  <span>Student</span>
                  <span>Status</span>
                  <span>Progress</span>
                  <span>Enrolled</span>
                </div>

                {/* Rows */}
                {filtered.map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 items-start sm:items-center px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-blue-50/40 transition"
                  >
                    {/* Avatar + name (mobile stacking) */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                        {initials(e.student_name || "S")}
                      </div>
                      <span className="text-sm font-semibold text-[#0a1e5e] sm:hidden flex-1">
                        {e.student_name}
                      </span>
                    </div>

                    {/* Name (desktop) */}
                    <span className="hidden sm:block text-sm font-semibold text-[#0a1e5e] truncate">
                      {e.student_name}
                    </span>

                    {/* Status */}
                    <Badge
                      variant={
                        e.status === "completed"
                          ? "emerald"
                          : e.status === "cancelled"
                          ? "neutral"
                          : "gold"
                      }
                    >
                      {e.status}
                    </Badge>

                    {/* Progress ring */}
                    <div className="flex items-center gap-2">
                      <ProgressRing value={e.progress_percent} size={36} stroke={4} />
                      <span className="text-xs text-gray-500 sm:hidden">
                        {Math.round(e.progress_percent)}%
                      </span>
                    </div>

                    {/* Enrolled date */}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {formatDate(e.enrolled_at)}
                    </span>
                  </div>
                ))}

                {/* Footer summary */}
                <div className="px-5 py-3 bg-gray-50/60 text-xs text-gray-500 flex items-center justify-between">
                  <span>
                    Showing <strong>{filtered.length}</strong> of {roster.length} students
                  </span>
                  {selectedCourse && (
                    <span className="font-medium text-[#0a1e5e]">
                      {selectedCourse.title}
                    </span>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}