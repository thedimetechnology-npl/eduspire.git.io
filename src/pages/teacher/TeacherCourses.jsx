import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Star, Users, Edit3, Eye, EyeOff, BookOpen, Search,
} from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge, Button, EmptyState } from "../../components/ui/Kit";
import { formatCurrency, levelLabel } from "../../utils/helpers";

export default function TeacherCourses() {
  const [courses, setCourses] = useState(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await client.get("/courses", { params: { mine: true } });
    setCourses(data);
  };

  useEffect(() => {
    load();
  }, []);

  const togglePublish = async (course) => {
    await client.patch(`/courses/${course.id}/publish`, null, {
      params: { publish: course.status !== "published" },
    });
    load();
  };

  if (!courses) return <Spinner />;

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/course.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay for readability on the right side */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/70 lg:to-white/85" />

      {/* ==================== CONTENT ==================== */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">

          {/* LEFT SPACER — the image already has content here */}
          <div className="hidden lg:block">
            {/* Nothing — left side is the image */}
          </div>

          {/* RIGHT SIDE — Course Grid */}
          <div className="lg:pl-4">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-bold text-[#0a1e5e]">My Courses</h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {courses.length} course{courses.length !== 1 ? "s" : ""} total
                </p>
              </div>
              <Link to="/teacher/courses/new">
                <Button
                  icon={Plus}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  New Course
                </Button>
              </Link>
            </div>

            {/* Search */}
            <div className="relative mb-5 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-sm"
              />
            </div>

            {/* Course list */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center shadow-sm">
                <EmptyState
                  icon={BookOpen}
                  title={courses.length === 0 ? "No courses yet" : "No matches"}
                  description={
                    courses.length === 0
                      ? "Create your first course to start teaching."
                      : "Try a different search term."
                  }
                  action={
                    courses.length === 0 && (
                      <Link to="/teacher/courses/new">
                        <Button>Create course</Button>
                      </Link>
                    )
                  }
                />
              </div>
            ) : (
              <div className="grid sm:grid-cols-1 xl:grid-cols-2 gap-4">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.25)] transition-all flex flex-col"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <Badge
                        variant={c.status === "published" ? "emerald" : "neutral"}
                      >
                        {c.status === "published" ? "Published" : "Draft"}
                      </Badge>
                      <Badge variant="gold">
                        {c.price > 0 ? formatCurrency(c.price) : "Free"}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-[#0a1e5e] leading-snug mb-1 line-clamp-2">
                      {c.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      {levelLabel(c.level)} · {c.lesson_count} lessons
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {c.enrolled_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        {c.rating_avg || "—"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex gap-2">
                      <Link
                        to={`/teacher/courses/${c.id}/edit`}
                        className="flex-1"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Edit3}
                          className="w-full"
                        >
                          Edit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant={c.status === "published" ? "outline" : "gold"}
                        icon={c.status === "published" ? EyeOff : Eye}
                        onClick={() => togglePublish(c)}
                      >
                        {c.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}