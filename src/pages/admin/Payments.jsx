import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge, EmptyState } from "../../components/ui/Kit";
import { formatCurrency, formatDateTime } from "../../utils/helpers";

export default function Payments() {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    client.get("/payments/admin-history")
      .then(({ data }) => setPayments(data))
      .catch(() => setError(true));
  }, []);

  if (error) return <EmptyState icon={Receipt} title="Failed to load payments" />;
  if (!payments) return <Spinner />;

  const total = payments
    .filter((p) => p.status?.toUpperCase() === "SUCCESS")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
      <Card className="mb-6 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gold-soft text-gold-dark flex items-center justify-center"><Receipt className="w-5 h-5" /></div>
        <div>
          <p className="font-display text-2xl font-semibold text-ink">{formatCurrency(total)}</p>
          <p className="text-xs text-muted">Total revenue across {payments.length} transactions</p>
        </div>
      </Card>

      {payments.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments yet" />
      ) : (
        <Card padded={false}>
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide border-b border-border">
            <span>Course</span><span>Invoice</span><span>Method</span><span>Status</span><span>Amount</span>
          </div>
          {payments.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-text">{p.course_title || "Subscription"}</p>
                <p className="text-xs text-muted">{formatDateTime(p.created_at)}</p>
              </div>
              <span className="text-xs font-mono text-muted">{p.invoice_number}</span>
              <span className="text-xs text-muted capitalize">{p.gateway || "N/A"}</span>
              <Badge
                variant={p.status?.toUpperCase() === "SUCCESS" ? "emerald" : "danger"}
              >
                {p.status}
              </Badge>
              <span className="text-sm font-semibold text-text">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </Card>
      )}
  );
}
