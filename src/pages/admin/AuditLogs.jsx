import { useEffect, useState } from "react";
import { ScrollText, Search } from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge, EmptyState } from "../../components/ui/Kit";
import { Pagination } from "../../components/ui/Pagination";
import { formatDateTime } from "../../utils/helpers";

export default function AuditLogs() {
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = { page, page_size: 25 };
    if (filter) params.action = filter;
    const t = setTimeout(() => {
      client.get("/admin/audit-logs", { params }).then(({ data }) => setResult(data));
    }, 250);
    return () => clearTimeout(t);
  }, [filter, page]);

  useEffect(() => { setPage(1); }, [filter]);

  const logs = result?.items ?? null;

  return (
      <div className="relative max-w-sm mb-6">
        <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action (e.g. login)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-strong bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
        />
      </div>

      {!logs ? (
        <Spinner />
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit log entries found" />
      ) : (
        <>
          <Card padded={false}>
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide border-b border-border">
              <span>User</span><span>Action</span><span>IP</span><span>When</span>
            </div>
            {logs.map((l) => (
              <div key={l.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-3 border-b border-border last:border-0">
                <span className="text-sm font-medium text-text whitespace-nowrap">{l.user_name}</span>
                <Badge variant="neutral" className="w-fit font-mono">{l.action}</Badge>
                <span className="text-xs text-muted font-mono">{l.ip_address || "—"}</span>
                <span className="text-xs text-muted whitespace-nowrap">{formatDateTime(l.created_at)}</span>
              </div>
            ))}
          </Card>
          <Pagination page={result.page} totalPages={result.total_pages} total={result.total} onPageChange={setPage} />
        </>
      )}
  );
}
