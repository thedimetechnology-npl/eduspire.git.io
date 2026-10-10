import { useEffect, useState } from "react";
import { Activity, TrendingUp } from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge } from "../../components/ui/Kit";
import { StatCard } from "../../components/ui/Modal";
import { ChartCard } from "../../components/charts/ChartCard";
import { formatCurrency } from "../../utils/helpers";

const TABS = [
  { key: "bi", label: "Business Intelligence" },
  { key: "students", label: "Student Performance" },
  { key: "courses", label: "Course Analytics" },
  { key: "attendance", label: "Attendance" },
];

export default function Reports() {
  const [tab, setTab] = useState("bi");
  const [bi, setBi] = useState(null);
  const [students, setStudents] = useState(null);
  const [courses, setCourses] = useState(null);
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    client.get("/bi/overview").then(({ data }) => setBi(data));
    client.get("/reports/student-performance").then(({ data }) => setStudents(data));
    client.get("/reports/course-analytics").then(({ data }) => setCourses(data));
    client.get("/reports/attendance").then(({ data }) => setAttendance(data));
  }, []);

  return (
    <>
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-thin pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-ink text-white" : "bg-surface text-text border border-border hover:bg-paper"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bi" && (
        !bi ? <Spinner /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Activity} label="Daily active users" value={bi.dau} accent="ink" />
              <StatCard icon={Activity} label="Monthly active users" value={bi.mau} accent="gold" />
              <StatCard icon={TrendingUp} label="Completion rate" value={`${bi.course_completion_rate}%`} accent="emerald" />
              <StatCard icon={TrendingUp} label="Total revenue" value={formatCurrency(bi.total_revenue)} accent="ink" />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Engagement (logins, last 7 days)" type="line" data={bi.engagement_by_day} color="#16213E" />
              <ChartCard title="Student growth by month" type="line" data={bi.student_growth} color="#2F8F6E" />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Top courses" data={bi.top_courses} />
              <ChartCard title="Top teachers by enrollment" data={bi.top_teachers} color="#C9974A" />
            </div>
          </div>
        )
      )}

      {tab === "students" && (
        !students ? <Spinner /> : (
          <Card padded={false}>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide border-b border-border">
              <span>Student</span><span>Enrolled</span><span>Completed</span><span>Avg. quiz score</span><span>Attendance</span>
            </div>
            {students.map((s) => (
              <div key={s.student_id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-border last:border-0">
                <span className="text-sm font-medium text-text">{s.student_name}</span>
                <span className="text-sm text-muted">{s.courses_enrolled}</span>
                <span className="text-sm text-muted">{s.courses_completed}</span>
                <Badge variant={s.average_quiz_score >= 70 ? "emerald" : "gold"}>{s.average_quiz_score}%</Badge>
                <span className="text-sm text-muted font-mono">{s.attendance_percentage}%</span>
              </div>
            ))}
          </Card>
        )
      )}

      {tab === "courses" && (
        !courses ? <Spinner /> : (
          <Card padded={false}>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide border-b border-border">
              <span>Course</span><span>Enrolled</span><span>Completion</span><span>Rating</span><span>Revenue</span>
            </div>
            {courses.map((c) => (
              <div key={c.course_id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-border last:border-0">
                <span className="text-sm font-medium text-text truncate">{c.title}</span>
                <span className="text-sm text-muted">{c.enrolled_count}</span>
                <span className="text-sm text-muted">{c.completion_rate}%</span>
                <span className="text-sm text-muted">{c.average_rating || "—"}</span>
                <span className="text-sm font-semibold text-text">{formatCurrency(c.revenue)}</span>
              </div>
            ))}
          </Card>
        )
      )}

      {tab === "attendance" && (
        !attendance ? <Spinner /> : (
          <Card padded={false}>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide border-b border-border">
              <span>Course</span><span>Sessions</span><span>Present</span><span>Rate</span>
            </div>
            {attendance.map((a) => (
              <div key={a.course_id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-border last:border-0">
                <span className="text-sm font-medium text-text truncate">{a.title}</span>
                <span className="text-sm text-muted">{a.total_sessions}</span>
                <span className="text-sm text-muted">{a.present_count}</span>
                <Badge variant={a.percentage >= 75 ? "emerald" : "danger"}>{a.percentage}%</Badge>
              </div>
            ))}
          </Card>
        )
      )}
    </>
  );
}
