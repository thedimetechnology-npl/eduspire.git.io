import { useEffect, useState } from "react";
import {
  Plus, Trash2, FileQuestion, Trophy, Search, Clock, Award, CheckCircle2,
} from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Badge, Button, Input, Select, EmptyState } from "../../components/ui/Kit";
import { Modal } from "../../components/ui/Modal";
import { extractErrorMessage } from "../../utils/helpers";

const emptyQuestion = () => ({
  text: "",
  options: ["", "", "", ""],
  correct_index: 0,
  marks: 1,
  topic_tag: "",
});

export default function TeacherQuizzes() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [quizzes, setQuizzes] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(15);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    client.get("/courses", { params: { mine: true } }).then(({ data }) => {
      setCourses(data);
      if (data.length > 0) setCourseId(String(data[0].id));
    });
  }, []);

  const loadQuizzes = () => {
    if (!courseId) return;
    setQuizzes(null);
    client.get(`/courses/${courseId}/quizzes`).then(({ data }) => setQuizzes(data));
  };
  useEffect(loadQuizzes, [courseId]);

  const updateQuestion = (i, patch) =>
    setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const updateOption = (qi, oi, value) =>
    setQuestions(
      questions.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q
      )
    );

  const createQuiz = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await client.post("/quizzes", {
        course_id: Number(courseId),
        title,
        duration_minutes: Number(duration),
        questions: questions.map((q) => ({
          ...q,
          marks: Number(q.marks),
          correct_index: Number(q.correct_index),
        })),
      });
      setCreateOpen(false);
      setTitle("");
      setQuestions([emptyQuestion()]);
      loadQuizzes();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (quiz) => {
    setHistoryTarget(quiz);
    setHistory(null);
    const { data } = await client.get(`/quizzes/${quiz.id}/attempts`);
    setHistory(data);
  };

  const filtered = (quizzes ?? []).filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/qizz.png')",
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
                <h1 className="text-2xl font-bold text-[#0a1e5e]">Quizzes</h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {quizzes
                    ? `${filtered.length} quiz${filtered.length !== 1 ? "zes" : ""}`
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
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                )}
                <Button
                  icon={Plus}
                  onClick={() => setCreateOpen(true)}
                  disabled={!courseId}
                  className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                >
                  New Quiz
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-5 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search quizzes..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-sm"
              />
            </div>

            {/* Quizzes list */}
            {!quizzes ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <div className="py-16 flex justify-center">
                  <Spinner />
                </div>
              </Card>
            ) : quizzes.length === 0 ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <EmptyState
                  icon={FileQuestion}
                  title="No quizzes yet"
                  description="Create your first quiz with multiple-choice questions."
                />
              </Card>
            ) : filtered.length === 0 ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <EmptyState
                  icon={Search}
                  title="No matches"
                  description={`No quiz matches "${search}"`}
                />
              </Card>
            ) : (
              <div className="grid sm:grid-cols-1 xl:grid-cols-2 gap-4">
                {filtered.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.2)] transition-all flex flex-col"
                  >
                    {/* Icon + title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <FileQuestion className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#0a1e5e] truncate">
                          {q.title}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Multiple choice quiz
                        </p>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center py-2 rounded-lg bg-gray-50">
                        <p className="text-sm font-bold text-[#0a1e5e]">
                          {q.question_count ?? 0}
                        </p>
                        <p className="text-[10px] text-gray-500">Questions</p>
                      </div>
                      <div className="text-center py-2 rounded-lg bg-gray-50">
                        <p className="text-sm font-bold text-[#0a1e5e]">
                          {q.duration_minutes ?? 0}
                        </p>
                        <p className="text-[10px] text-gray-500">Minutes</p>
                      </div>
                      <div className="text-center py-2 rounded-lg bg-gray-50">
                        <p className="text-sm font-bold text-[#0a1e5e]">
                          {q.total_marks ?? 0}
                        </p>
                        <p className="text-[10px] text-gray-500">Marks</p>
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Trophy}
                      onClick={() => openHistory(q)}
                      className="w-full"
                    >
                      View Attempts
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== CREATE MODAL ==================== */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New quiz" size="xl">
        <form onSubmit={createQuiz} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quiz title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Duration (minutes)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="border border-border rounded-xl p-4 bg-gray-50/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-ink">
                    Question {i + 1}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Input
                  placeholder="Question text"
                  required
                  value={q.text}
                  onChange={(e) => updateQuestion(i, { text: e.target.value })}
                  className="mb-3"
                />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={q.correct_index === oi}
                        onChange={() => updateQuestion(i, { correct_index: oi })}
                        className="accent-gold"
                      />
                      <Input
                        placeholder={`Option ${oi + 1}`}
                        required
                        value={opt}
                        onChange={(e) => updateOption(i, oi, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Marks"
                    type="number"
                    min="1"
                    value={q.marks}
                    onChange={(e) => updateQuestion(i, { marks: e.target.value })}
                  />
                  <Input
                    placeholder="Topic tag (for weak-topic analytics)"
                    value={q.topic_tag}
                    onChange={(e) => updateQuestion(i, { topic_tag: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => setQuestions([...questions, emptyQuestion()])}
          >
            Add question
          </Button>

          {error && (
            <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={saving}>
            Create quiz
          </Button>
        </form>
      </Modal>

      {/* ==================== HISTORY MODAL ==================== */}
      <Modal
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        title={`Attempts — ${historyTarget?.title}`}
      >
        {!history ? (
          <Spinner />
        ) : history.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No attempts yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-paper"
              >
                <span className="text-sm font-medium text-text">
                  {h.student_name}
                </span>
                <Badge variant="emerald">
                  {h.score}/{h.total_marks}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}