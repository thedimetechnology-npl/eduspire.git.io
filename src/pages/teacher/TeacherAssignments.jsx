import { useEffect, useState } from "react";
import {
  Plus, ClipboardList, FileDown, Search, Calendar, Users, CheckCircle2, Clock,
} from "lucide-react";
import client, { API_URL } from "../../api/client";
import { Card, Spinner, Badge, Button, Input, Textarea, Select, EmptyState } from "../../components/ui/Kit";
import { Modal } from "../../components/ui/Modal";
import { formatDate, extractErrorMessage } from "../../utils/helpers";

const ORIGIN = API_URL.replace(/\/api$/, "");

export default function TeacherAssignments() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [assignments, setAssignments] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", max_score: 100 });
  const [gradeTarget, setGradeTarget] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    client.get("/courses", { params: { mine: true } }).then(({ data }) => {
      setCourses(data);
      if (data.length > 0) setCourseId(String(data[0].id));
    });
  }, []);

  const loadAssignments = () => {
    if (!courseId) return;
    setAssignments(null);
    client.get(`/courses/${courseId}/assignments`).then(({ data }) => setAssignments(data));
  };
  useEffect(loadAssignments, [courseId]);

  const createAssignment = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await client.post("/assignments", {
        course_id: Number(courseId),
        ...form,
        due_date: form.due_date || null,
        max_score: Number(form.max_score),
      });
      setCreateOpen(false);
      setForm({ title: "", description: "", due_date: "", max_score: 100 });
      loadAssignments();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openGrading = async (assignment) => {
    setGradeTarget(assignment);
    setSubmissions(null);
    const { data } = await client.get(`/assignments/${assignment.id}/submissions`);
    setSubmissions(data);
  };

  const gradeSubmission = async (submissionId, score, feedback) => {
    await client.patch(`/submissions/${submissionId}/grade`, { score: Number(score), feedback });
    const { data } = await client.get(`/assignments/${gradeTarget.id}/submissions`);
    setSubmissions(data);
    loadAssignments();
  };

  const selectedCourse = courses.find((c) => String(c.id) === String(courseId));

  const filtered = (assignments ?? []).filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/assignment.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Right-side white gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/75 lg:to-white/90" />

      {/* ==================== CONTENT ==================== */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">

          {/* LEFT SPACER — image shows through */}
          <div className="hidden lg:block" />

          {/* RIGHT SIDE */}
          <div className="lg:pl-4">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h1 className="text-2xl font-bold text-[#0a1e5e]">Assignments</h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {assignments
                    ? `${filtered.length} assignment${filtered.length !== 1 ? "s" : ""}`
                    : "Loading..."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {courses.length > 0 && (
                  <Select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full sm:w-56"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </Select>
                )}
                <Button
                  icon={Plus}
                  onClick={() => setCreateOpen(true)}
                  disabled={!courseId}
                  className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                >
                  New Assignment
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-5 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assignments..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-sm"
              />
            </div>

            {/* Assignments list */}
            {!assignments ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <div className="py-16 flex justify-center"><Spinner /></div>
              </Card>
            ) : assignments.length === 0 ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <EmptyState
                  icon={ClipboardList}
                  title="No assignments yet"
                  description="Create one to start collecting submissions."
                />
              </Card>
            ) : filtered.length === 0 ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <EmptyState icon={Search} title="No matches" description={`No assignment matches "${search}"`} />
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.2)] transition-all flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-6 h-6 text-blue-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#0a1e5e] truncate">{a.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {a.submission_count} submission{a.submission_count !== 1 ? "s" : ""}
                        </span>
                        {a.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Due {formatDate(a.due_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <Badge
                      variant={
                        a.submission_count === 0
                          ? "neutral"
                          : a.pending_count > 0
                          ? "gold"
                          : "emerald"
                      }
                      className="shrink-0"
                    >
                      {a.submission_count === 0
                        ? "No submissions"
                        : a.pending_count > 0
                        ? `${a.pending_count} to grade`
                        : "All graded"}
                    </Badge>

                    {/* Action */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openGrading(a)}
                      className="shrink-0"
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== CREATE MODAL ==================== */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New assignment">
        <form onSubmit={createAssignment} className="space-y-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due date"
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
            <Input
              label="Max score"
              type="number"
              value={form.max_score}
              onChange={(e) => setForm({ ...form, max_score: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" loading={saving}>Create assignment</Button>
        </form>
      </Modal>

      {/* ==================== GRADING MODAL ==================== */}
      <Modal
        open={!!gradeTarget}
        onClose={() => setGradeTarget(null)}
        title={`Submissions — ${gradeTarget?.title}`}
        size="lg"
      >
        {!submissions ? (
          <Spinner />
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No submissions yet.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((s) => (
              <SubmissionRow
                key={s.id}
                submission={s}
                maxScore={gradeTarget.max_score}
                onGrade={gradeSubmission}
              />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function SubmissionRow({ submission, maxScore, onGrade }) {
  const [score, setScore] = useState(submission.score ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");

  return (
    <div className="border border-border rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm text-text">{submission.student_name}</span>
        {submission.score != null && (
          <Badge variant="emerald">{submission.score}/{maxScore}</Badge>
        )}
      </div>
      {submission.notes && <p className="text-sm text-muted mb-2">{submission.notes}</p>}
      {submission.file_url && (
        <a
          href={`${ORIGIN}${submission.file_url}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-gold-dark font-medium hover:underline flex items-center gap-1 mb-3 w-fit"
        >
          <FileDown className="w-3.5 h-3.5" /> View attachment
        </a>
      )}
      <div className="flex items-end gap-2">
        <Input
          label="Score"
          type="number"
          max={maxScore}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-24"
        />
        <Input
          label="Feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="flex-1"
        />
        <Button size="sm" onClick={() => onGrade(submission.id, score, feedback)}>Save</Button>
      </div>
    </div>
  );
}