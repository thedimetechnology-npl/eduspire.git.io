import { useEffect, useState } from "react";
import { Award, Download, ShieldCheck } from "lucide-react";
import client, { API_URL } from "../../api/client";
// REMOVED: import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, Spinner, Button, EmptyState } from "../../components/ui/Kit";
import { SealBadge } from "../../components/ui/Seal";
import { formatDate } from "../../utils/helpers";

const ORIGIN = API_URL.replace(/\/api$/, "");

export default function StudentCertificates() {
  const [certs, setCerts] = useState(null);

  useEffect(() => {
    client.get("/certificates/my").then(({ data }) => setCerts(data));
  }, []);

  // Loading state — no wrapper needed
  if (!certs) return <Spinner />;

  return (
    <>
      {certs.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Complete a course to automatically earn your first certificate."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {certs.map((c) => (
            <Card key={c.id} className="relative overflow-hidden">
              <div className="absolute -right-6 -top-6 opacity-10">
                <SealBadge size={110} />
              </div>
              <div className="relative">
                <SealBadge size={44} className="mb-4" />
                <h3 className="font-display font-semibold text-ink text-lg leading-snug">{c.course_title}</h3>
                <p className="text-xs text-muted mt-1">Issued {formatDate(c.issued_at)}</p>
                <p className="text-xs font-mono text-muted mt-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald" /> {c.certificate_number}
                </p>
                {c.file_url && (
                  <a href={`${ORIGIN}${c.file_url}`} target="_blank" rel="noreferrer" className="block mt-4">
                    <Button size="sm" variant="gold" icon={Download}>Download PDF</Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}