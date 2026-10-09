import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Users, PlayCircle, Search, LayoutGrid, List, Bell, BookmarkCheck } from "lucide-react";
import client from "../../api/client";
import { Spinner, Badge, Select, EmptyState } from "../../components/ui/Kit";
import { Pagination } from "../../components/ui/Pagination";
import { formatCurrency, levelLabel } from "../../utils/helpers";

export default function CourseCatalog() {
  const [result, setResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("grid");

  useEffect(() => {
    client.get("/categories").then(({ data }) => setCategories(data));
  }, []);

  useEffect(() => {
    const params = { page, page_size: 12 };
    if (search) params.search = search;
    if (categoryId) params.category_id = categoryId;
    const timeout = setTimeout(() => {
      client.get("/courses", { params }).then(({ data }) => setResult(data));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, categoryId, page]);

  useEffect(() => { setPage(1); }, [search, categoryId]);

  const courses = result?.items ?? null;

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 h-[calc(100vh-4rem)] overflow-y-auto relative"
      style={{
        backgroundImage: "url('/catlog.png')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* LEFT-side white gradient for readability (content lives on left) */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/55 to-transparent" />

      {/* ==================== CONTENT ==================== */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">

          {/* LEFT SIDE — content */}
          <div className="lg:pr-4 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#0a1e5e]">Course Catalog</h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {result?.total ?? 0} course{(result?.total ?? 0) !== 1 ? "s" : ""} available
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                  <Bell className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                  <BookmarkCheck className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Search + Category + View toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] p-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="sm:w-48"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.course_count})
                  </option>
                ))}
              </Select>
              <button
                onClick={() => setView(view === "grid" ? "list" : "grid")}
                className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shrink-0"
                aria-label="Toggle view"
              >
                {view === "grid" ? (
                  <List className="w-4 h-4 text-gray-600" />
                ) : (
                  <LayoutGrid className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>

            {/* Course grid / list */}
            {!courses ? (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_15px_40px_-12px_rgba(30,64,175,0.15)]">
                <div className="py-16 flex justify-center"><Spinner /></div>
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_15px_40px_-12px_rgba(30,64,175,0.15)]">
                <EmptyState
                  icon={Search}
                  title="No courses found"
                  description="Try a different search term or category."
                />
              </div>
            ) : (
              <>
                <div
                  className={
                    view === "grid"
                      ? "grid sm:grid-cols-1 xl:grid-cols-2 gap-4"
                      : "space-y-3"
                  }
                >
                  {courses.map((c) => (
                    <CourseCard key={c.id} course={c} view={view} />
                  ))}
                </div>
                <Pagination
                  page={result.page}
                  totalPages={result.total_pages}
                  total={result.total}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>

          {/* RIGHT SPACER — image shows through */}
          <div className="hidden lg:block" />
        </div>
      </div>
    </div>
  );
}

// ==================== COURSE CARD ====================
function CourseCard({ course: c, view }) {
  const thumbnail = (
    <div className="relative h-36 bg-gradient-to-br from-[#0a1e5e] via-[#1e3a8a] to-[#1e40af] flex items-center justify-center overflow-hidden">
      <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-blue-400/20"></div>
      <div className="absolute bottom-3 left-4 w-20 h-20 rounded-full bg-purple-400/20"></div>
      <PlayCircle className="w-11 h-11 text-white/40 relative z-10" />
      <div className="absolute top-3 right-3 z-10">
        <Badge variant={c.price > 0 ? "gold" : "emerald"}>
          {c.price > 0 ? formatCurrency(c.price) : "Free"}
        </Badge>
      </div>
      <div className="absolute top-3 left-3 z-10">
        <Badge variant="neutral">{levelLabel(c.level)}</Badge>
      </div>
    </div>
  );

  const content = (
    <div className="p-5 flex-1 flex flex-col">
      <h3 className="font-semibold text-[#0a1e5e] leading-snug mb-1 line-clamp-2">
        {c.title}
      </h3>
      <p className="text-xs text-gray-500 mb-3">by {c.teacher_name}</p>
      <div className="mt-auto flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          {c.rating_avg || "New"}
          {c.rating_count > 0 && ` (${c.rating_count})`}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {c.enrolled_count}
        </span>
      </div>
    </div>
  );

  if (view === "list") {
    return (
      <Link to={`/course/${c.id}`}>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.2)] transition-all flex flex-row overflow-hidden">
          <div className="w-48 shrink-0">{thumbnail}</div>
          <div className="flex-1 flex flex-col">{content}</div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/course/${c.id}`}>
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.2)] transition-all h-full flex flex-col overflow-hidden">
        {thumbnail}
        {content}
      </div>
    </Link>
  );
}