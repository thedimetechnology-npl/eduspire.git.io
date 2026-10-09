import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import client from "../../api/client";
// REMOVED: import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, Spinner, EmptyState } from "../../components/ui/Kit";
import { ProgressRing } from "../../components/ui/Seal";

export default function StudentAttendance() {
  const [summaries, setSummaries] = useState(null);

  useEffect(() => {
    client.get("/attendance/my")
      .then(({ data }) => setSummaries(data))
      .catch(() => setSummaries([]));
  }, []);

  // Loading state — no wrapper needed
  if (!summaries) return <Spinner />;

  return (
    <>
      {summaries.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No attendance records yet"
          description="Attendance is tracked once your teacher starts marking live class sessions."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {summaries.map((s) => (
            <Card key={s.course_id} className="flex items-center gap-4">
              <ProgressRing value={s.percentage} size={64} stroke={6} />
              <div>
                <h3 className="font-display font-semibold text-ink text-sm leading-snug">{s.course_title}</h3>
                <p className="text-xs text-muted mt-1">
                  {s.present_count} present · {s.late_count} late · {s.absent_count} absent
                </p>
                <p className="text-[11px] text-muted-light mt-1">
                  Attendance rate counts present and late sessions
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}