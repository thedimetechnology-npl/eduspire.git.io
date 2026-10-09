import { useEffect, useState } from "react";
import { Search, BookOpen, Star, Users } from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge, Select, EmptyState } from "../../components/ui/Kit";
import { Pagination } from "../../components/ui/Pagination";
import { formatCurrency, levelLabel } from "../../utils/helpers";

export default function ManageCourses() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = { page, page_size: 15 };
    if (search) params.search = search;
    if (status) params.status = status;
    setError(null);
    const t = setTimeout(() => client.get("/courses", { params })
      .then(({ data }) => setResult(data))
      .catch(() => setError("Failed to load courses")), 250);
    return () => clearTimeout(t);
  }, [search, status, page]);

  useEffect(() => { setPage(1); }, [search, status]);

  const courses = result?.items ?? null;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-strong bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </div>

      {error ? (
        <EmptyState icon={BookOpen} title="Failed to load courses" />
      ) : !courses ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses found" />
      ) : (
        <>
          <Card padded={false}>
            {courses.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{c.title}</p>
                  <p className="text-xs text-muted truncate">{c.teacher_name} · {levelLabel(c.level)}</p>
                </div>
                <span className="text-xs text-muted hidden sm:flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c.enrolled_count}</span>
                <span className="text-xs text-muted hidden sm:flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" /> {c.rating_avg || "—"}</span>
                <span className="text-xs font-medium text-text w-16 text-right">{c.price > 0 ? formatCurrency(c.price) : "Free"}</span>
                <Badge variant={c.status === "published" ? "emerald" : "neutral"}>{c.status}</Badge>
              </div>
            ))}
          </Card>
          <Pagination page={result.page} totalPages={result.total_pages} total={result.total} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
