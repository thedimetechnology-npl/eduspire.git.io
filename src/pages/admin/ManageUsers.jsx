import { useCallback, useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge, Button, EmptyState } from "../../components/ui/Kit";
import { Pagination } from "../../components/ui/Pagination";
import { initials, formatDate } from "../../utils/helpers";

export default function ManageUsers() {
  const [tab, setTab] = useState("student");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);

  const load = useCallback(() => {
    const endpoint = tab === "student" ? "/users/students" : "/users/teachers";
    const params = { page, page_size: 15 };
    if (search) params.search = search;
    client.get(endpoint, { params }).then(({ data }) => setResult(data));
  }, [tab, search, page]);

  useEffect(() => {
    setResult(null);
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [tab, search]);

  const toggleStatus = async (user) => {
    await client.patch(`/users/${user.id}/status`, { is_active: !user.is_active });
    load();
  };

  const users = result?.items ?? null;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2">
          <TabButton active={tab === "student"} onClick={() => setTab("student")}>Students</TabButton>
          <TabButton active={tab === "teacher"} onClick={() => setTab("teacher")}>Teachers</TabButton>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-strong bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          />
        </div>
      </div>

      {!users ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search term." />
      ) : (
        <>
          <Card padded={false}>
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0">
                <div className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold shrink-0">{initials(u.full_name)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{u.full_name}</p>
                  <p className="text-xs text-muted truncate">{u.email}</p>
                </div>
                {tab === "teacher" && u.teacher_profile?.subjects?.length > 0 && (
                  <span className="text-xs text-muted hidden sm:block">{u.teacher_profile.subjects.join(", ")}</span>
                )}
                <span className="text-xs text-muted hidden sm:block">Joined {formatDate(u.created_at)}</span>
                <Badge variant={u.is_active ? "emerald" : "danger"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                <Button size="sm" variant="outline" onClick={() => toggleStatus(u)}>
                  {u.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))}
          </Card>
          <Pagination page={result.page} totalPages={result.total_pages} total={result.total} onPageChange={setPage} />
        </>
      )}
    </>
  );
}

function TabButton({ active, children, ...props }) {
  return (
    <button className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${active ? "bg-ink text-white" : "bg-surface text-text border border-border hover:bg-paper"}`} {...props}>
      {children}
    </button>
  );
}
