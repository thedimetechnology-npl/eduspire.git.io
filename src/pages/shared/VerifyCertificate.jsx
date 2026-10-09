import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BadgeCheck, XCircle } from "lucide-react";
import client from "../../api/client";
import { Card, Spinner } from "../../components/ui/Kit";
import { SealBadge } from "../../components/ui/Seal";
import { formatDate } from "../../utils/helpers";

export default function VerifyCertificate() {
  const { certificateNumber } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    client.get(`/certificates/verify/${certificateNumber}`).then(({ data }) => setResult(data));
  }, [certificateNumber]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <SealBadge size={32} />
          <span className="brand-wordmark text-xl font-semibold text-ink">eduspire</span>
        </div>
        <Card className="text-center">
          {!result ? (
            <Spinner />
          ) : result.valid ? (
            <>
              <BadgeCheck className="w-14 h-14 text-emerald mx-auto mb-4" />
              <h1 className="font-display text-xl font-semibold text-ink mb-1">Certificate Verified</h1>
              <p className="text-sm text-muted mb-6">This certificate is authentic and on record.</p>
              <div className="text-left bg-paper rounded-xl p-4 space-y-2">
                <Row label="Student" value={result.student_name} />
                <Row label="Course" value={result.course_title} />
                <Row label="Issued" value={formatDate(result.issued_at)} />
                <Row label="Certificate No." value={result.certificate_number} mono />
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-14 h-14 text-danger mx-auto mb-4" />
              <h1 className="font-display text-xl font-semibold text-ink mb-1">Not Found</h1>
              <p className="text-sm text-muted">No certificate matches number "{certificateNumber}".</p>
            </>
          )}
        </Card>
        <Link to="/login" className="block text-center text-sm text-muted hover:text-ink mt-6">
          Go to eduspire
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-medium text-ink ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
