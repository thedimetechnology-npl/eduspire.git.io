import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Clock, CheckCircle2, Trophy, ArrowLeft } from "lucide-react";
import client from "../../api/client";
import { Card, Button } from "../../components/ui/Kit";

export default function QuizAttempt() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const quiz = location.state?.quiz;

  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(quiz ? quiz.duration_minutes * 60 : 0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (submitting || result) return;
    setSubmitting(true);
    const { data } = await client.post(`/quizzes/attempt/${attemptId}/submit`, { answers });
    setResult(data);
    setSubmitting(false);
  }, [answers, attemptId, submitting, result]);

  useEffect(() => {
    if (!quiz || result) return;
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft, quiz, result, submit]);

  if (!quiz) {
    return (
      <Card className="text-center py-10">
        <p className="text-sm text-muted mb-4">This quiz session has expired. Please start it again from the Quizzes page.</p>
        <Button onClick={() => navigate("/student/quizzes")}>Back to quizzes</Button>
      </Card>
    );
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const answeredCount = Object.keys(answers).length;

  if (result) {
    const pct = result.total_marks ? Math.round((result.score / result.total_marks) * 100) : 0;
    return (
      <Card className="max-w-lg mx-auto text-center py-10">
        <Trophy className="w-14 h-14 text-gold mx-auto mb-4" />
        <h2 className="font-display text-2xl font-semibold text-ink mb-1">Quiz submitted!</h2>
        <p className="text-sm text-muted mb-6">{quiz.title}</p>
        <p className="font-display text-4xl font-semibold text-ink mb-1">{result.score} / {result.total_marks}</p>
        <p className="text-sm text-muted mb-8">{pct}% score</p>
        <Button onClick={() => navigate("/student/quizzes")}>Back to quizzes</Button>
      </Card>
    );
  }

  return (
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/student/quizzes")} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="w-4 h-4" /> Exit quiz
        </button>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-semibold ${secondsLeft < 60 ? "bg-danger-soft text-danger" : "bg-ink text-white"}`}>
          <Clock className="w-4 h-4" /> {mins}:{secs}
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-semibold text-ink">{quiz.title}</h2>
          <span className="text-xs text-muted">{answeredCount}/{quiz.questions.length} answered</span>
        </div>
        <div className="h-1.5 bg-paper rounded-full overflow-hidden mt-3">
          <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${(answeredCount / quiz.questions.length) * 100}%` }} />
        </div>
      </Card>

      <div className="space-y-4">
        {quiz.questions.map((q, i) => (
          <Card key={q.id}>
            <p className="font-medium text-text mb-4">{i + 1}. {q.text}</p>
            <div className="space-y-2">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswers({ ...answers, [q.id]: idx })}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-center gap-3 ${
                    answers[q.id] === idx ? "border-gold bg-gold-soft text-ink font-medium" : "border-border-strong hover:bg-paper text-text"
                  }`}
                >
                  {answers[q.id] === idx ? <CheckCircle2 className="w-4 h-4 text-gold-dark shrink-0" /> : <span className="w-4 h-4 rounded-full border border-border-strong shrink-0" />}
                  {opt}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Button className="w-full mt-6" size="lg" loading={submitting} onClick={submit}>
        Submit quiz
      </Button>
  );
}
