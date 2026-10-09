import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileQuestion, Clock, Trophy, Search, Bell, BookmarkCheck,
  PlayCircle, Target, TrendingUp, Award, CheckCircle2,
} from "lucide-react";
import client from "../../api/client";
import { Spinner, Badge, Button, EmptyState } from "../../components/ui/Kit";

const TABS = [
  { key: "all", label: "All Quizzes" },
  { key: "upcoming", label: "Not Attempted" },
  { key: "completed", label: "Attempted" },
];

export default function StudentQuizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState(null);
  const [starting, setStarting] = useState(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    client.get("/my-courses")
      .then(async ({ data: enrollments }) => {
        const lists = await Promise.all(
          enrollments.map((e) =>
            client.get(`/courses/${e.course.id}/quizzes`)
              .then((r) => r.data)
              .catch(() => [])
          )
        );
        setQuizzes(lists.flat());
      })
      .catch(() => setQuizzes([]));
  }, []);

  const startAttempt = async (quiz) => {
    setStarting(quiz.id);
    try {
      const { data } = await client.post(`/quizzes/${quiz.id}/attempt`);
      navigate(`/student/quizzes/${quiz.id}/attempt/${data.attempt_id}`, {
        state: { quiz: data.quiz },
      });
    } finally {
      setStarting(null);
    }
  };

  if (!quizzes) return <Spinner />;

  const filtered = quizzes.filter((q) => {
    if (tab === "upcoming" && q.attempt_count > 0) return false;
    if (tab === "completed" && q.attempt_count === 0) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const attempted = quizzes.filter((q) => q.attempt_count > 0);
  const bestScores = attempted.map((q) => (q.best_score / q.total_marks) * 100 || 0);
  const bestScore = bestScores.length > 0 ? Math.round(Math.max(...bestScores)) : 0;
  const avgScore =
    bestScores.length > 0
      ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length)
      : 0;
  const overallProgress =
    quizzes.length > 0 ? Math.round((attempted.length / quizzes.length) * 100) : 0;

  const counts = {
    all: quizzes.length,
    upcoming: quizzes.filter((q) => q.attempt_count === 0).length,
    completed: attempted.length,
  };

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/stuquiz.png')",
        backgroundSize: "cover",
        backgroundPosition: "70% center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Readability veil: dark tint left, whiter right */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 via-white/50 to-white/90" />

      {/* ==================== CONTENT ==================== */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-[#0a1e5e]">
                Quizzes &amp; Mock Tests
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} available
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                <Bell className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                <BookmarkCheck className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] mb-5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Progress ring */}
              <div className="relative w-32 h-32 shrink-0">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none" stroke="#e5e7eb" strokeWidth="10"
                  />
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(overallProgress / 100) * 327} 327`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <p className="text-2xl font-bold text-[#0a1e5e]">
                    {overallProgress}%
                  </p>
                  <p className="text-[10px] text-gray-500">Progress</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
                <div className="text-center p-3 rounded-xl bg-blue-50">
                  <Target className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-[#0a1e5e]">
                    {attempted.length}
                  </p>
                  <p className="text-[11px] text-gray-500">Attempted</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-green-50">
                  <Award className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-[#0a1e5e]">
                    {bestScore}%
                  </p>
                  <p className="text-[11px] text-gray-500">Best Score</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-purple-50">
                  <TrendingUp className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-[#0a1e5e]">
                    {avgScore}%
                  </p>
                  <p className="text-[11px] text-gray-500">Average</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs + Search */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] p-2 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1 bg-gray-50/80 rounded-xl p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t.key
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-white hover:text-blue-600"
                    }`}
                >
                  {t.label}
                  {counts[t.key] > 0 && (
                    <span
                      className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key
                          ? "bg-white/25 text-white"
                          : "bg-gray-200 text-gray-700"
                        }`}
                    >
                      {counts[t.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search quizzes..."
                className="w-full sm:w-72 pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quiz List */}
          {filtered.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm">
              <EmptyState
                icon={FileQuestion}
                title={tab === "all" ? "No quizzes yet" : `No ${tab} quizzes`}
                description="Quizzes from your enrolled courses will appear here."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => {
                const completed = q.attempt_count > 0;
                return (
                  <div
                    key={q.id}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.2)] transition-all flex flex-col sm:flex-row sm:items-center gap-4 p-4"
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <FileQuestion className="w-6 h-6 text-blue-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-[#0a1e5e] text-sm truncate">
                          {q.title}
                        </h3>
                        {completed ? (
                          q.best_score != null ? (
                            <Badge variant="emerald">
                              Score: {Math.round((q.best_score / q.total_marks) * 100)}%
                            </Badge>
                          ) : (
                            <Badge variant="gold">Completed</Badge>
                          )
                        ) : (
                          <Badge variant="neutral">Not Attempted</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {q.course_title}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileQuestion className="w-3.5 h-3.5" />{" "}
                          {q.question_count} Questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />{" "}
                          {q.duration_minutes} Minutes
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />{" "}
                          {q.total_marks} Marks
                        </span>
                        {completed && (
                          <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            <Trophy className="w-3.5 h-3.5" />{" "}
                            {q.attempt_count} attempt
                            {q.attempt_count > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <Button
                      size="sm"
                      className={`shrink-0 ${completed
                          ? "bg-white border border-blue-600 text-blue-600 hover:bg-blue-50"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      loading={starting === q.id}
                      onClick={() => startAttempt(q)}
                      disabled={q.question_count === 0}
                      icon={completed ? CheckCircle2 : PlayCircle}
                    >
                      {completed ? "Retake" : "Start Quiz"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}