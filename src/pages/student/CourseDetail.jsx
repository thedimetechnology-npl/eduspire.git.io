import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Star, Users, Clock, PlayCircle, FileText, CheckCircle2, Lock, ArrowLeft,
  BookOpen, Award, Calendar, Share2, Heart,
} from "lucide-react";
import client from "../../api/client";
// REMOVED: import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, Spinner, Badge, Button, Textarea } from "../../components/ui/Kit";
import { formatCurrency, levelLabel, extractErrorMessage } from "../../utils/helpers";
import { useAuth } from "../../context/useAuth";
import { createPayment, verifyPayment } from "../../api/payment";
import { openCashfreeCheckout } from "../../utils/cashfree";

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });

  const load = useCallback(() => {
    client.get(`/courses/${id}`).then(({ data }) => setCourse(data)).catch(() => setCourse(null));
    client.get(`/reviews/course/${id}`).then(({ data }) => setReviews(data)).catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEnroll = async () => {
    setError("");
    setEnrolling(true);

    try {
      if (course.price > 0) {
        // Create payment order
        const payment = await createPayment({ course_id: course.id });

        // Open Cashfree Checkout
        await openCashfreeCheckout(payment.payment_session_id);

        // Verify payment after checkout
        await verifyPayment(payment.order_id);

        // Reload course details
        load();
      } else {
        await client.post(`/courses/${course.id}/enroll`);
        load();
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setEnrolling(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    await client.post("/reviews", { course_id: course.id, ...reviewForm });
    load();
  };

  // Loading state
  if (!course) return <Spinner />;

  const isStudent = user?.role === "student";
  const alreadyReviewed = reviews.some((r) => r.student_id === user?.id);

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0a1e5e] mb-5 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to courses
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ==================== LEFT: MAIN CONTENT ==================== */}
        <div className="lg:col-span-2 space-y-6">

          {/* Hero thumbnail */}
          <div className="relative h-64 rounded-3xl bg-gradient-to-br from-[#0a1e5e] via-[#1e3a8a] to-[#1e40af] overflow-hidden flex items-center justify-center">
            {/* Decorative circles */}
            <div className="absolute top-6 right-6 w-24 h-24 rounded-full bg-blue-400/20"></div>
            <div className="absolute bottom-6 left-6 w-32 h-32 rounded-full bg-purple-400/20"></div>

            {/* Big play button */}
            <button className="relative z-10 w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition">
              <PlayCircle className="w-10 h-10 text-white" />
            </button>

            {/* Preview badge */}
            <span className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1.5 rounded-full">
              Preview
            </span>
          </div>

          {/* Title + meta */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="neutral">{levelLabel(course.level)}</Badge>
              {course.category_name && <Badge variant="gold">{course.category_name}</Badge>}
            </div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1e5e] leading-tight">
                {course.title}
              </h1>
              <div className="flex items-center gap-1 shrink-0">
                <button className="p-2 rounded-lg hover:bg-gray-100 transition">
                  <Heart className="w-4 h-4 text-gray-500" />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 transition">
                  <Share2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{course.description}</p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-gray-800">{course.rating_avg || "New"}</span>
                {course.rating_count > 0 && (
                  <span className="text-gray-500">({course.rating_count} reviews)</span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> {course.enrolled_count} students
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {course.lesson_count} lessons
              </span>
            </div>

            {/* Instructor */}
            <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                {course.teacher_name?.charAt(0) || "T"}
              </div>
              <div>
                <p className="text-xs text-gray-500">Instructor</p>
                <p className="text-sm font-semibold text-[#0a1e5e]">{course.teacher_name}</p>
              </div>
            </div>
          </div>

          {/* ==================== COURSE CONTENT ==================== */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[#0a1e5e]">Course Content</h3>
              <span className="text-xs text-gray-500">
                {course.lesson_count} lessons
              </span>
            </div>
            <div className="space-y-2">
              {course.lessons.map((lesson, i) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition"
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    {course.is_enrolled ? (
                      lesson.is_completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-blue-600" />
                      )
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Title */}
                  <span className="text-sm text-gray-800 flex-1 font-medium">
                    {i + 1}. {lesson.title}
                  </span>

                  {/* Type + duration */}
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    {lesson.lesson_type === "pdf" ? (
                      <FileText className="w-3.5 h-3.5" />
                    ) : (
                      <PlayCircle className="w-3.5 h-3.5" />
                    )}
                    {lesson.duration_minutes}m
                  </span>

                  {/* Open button */}
                  {course.is_enrolled && lesson.content_url && (
                    <Button
                      size="sm"
                      onClick={() => window.open(lesson.content_url, "_blank")}
                    >
                      Open
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ==================== REVIEWS ==================== */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-bold text-lg text-[#0a1e5e] mb-4">
              Reviews ({reviews.length})
            </h3>

            {/* Review form */}
            {isStudent && course.is_enrolled && !alreadyReviewed && (
              <form
                onSubmit={submitReview}
                className="mb-5 pb-5 border-b border-gray-100 space-y-3"
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                    >
                      <Star
                        className={`w-6 h-6 ${
                          n <= reviewForm.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Share your thoughts on this course..."
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  rows={3}
                />
                <Button type="submit" size="sm">
                  Post review
                </Button>
              </form>
            )}

            {/* Reviews list */}
            <div className="space-y-4">
              {reviews.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">
                  No reviews yet.
                </p>
              )}
              {reviews.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                        {r.student_name?.charAt(0) || "S"}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {r.student_name}
                      </span>
                    </div>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < r.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== RIGHT: ENROLLMENT PANEL ==================== */}
        <div>
          <div className="sticky top-24 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            {/* Price */}
            <div className="mb-5">
              <p className="text-3xl font-bold text-[#0a1e5e] mb-1">
                {course.price > 0 ? formatCurrency(course.price) : "Free"}
              </p>
              {course.price > 0 && (
                <p className="text-xs text-emerald-600 font-medium">
                  Lifetime access
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                {error}
              </p>
            )}

            {/* Enroll / Continue button */}
            {!isStudent ? (
              <p className="text-sm text-gray-500 text-center py-3">
                Enrollment is available for student accounts.
              </p>
            ) : course.is_enrolled ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Your progress</span>
                    <span className="font-semibold text-[#0a1e5e]">
                      {Math.round(course.my_progress)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                      style={{ width: `${course.my_progress}%` }}
                    ></div>
                  </div>
                </div>
                <Link to={`/student/learn/${course.id}`}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                    Continue Learning
                  </Button>
                </Link>
              </>
            ) : (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
                loading={enrolling}
                onClick={handleEnroll}
              >
                {course.price > 0 ? "Enroll & Pay" : "Enroll for Free"}
              </Button>
            )}

            {/* Course info list */}
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Level
                </span>
                <span className="font-semibold text-gray-800">
                  {levelLabel(course.level)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Lessons
                </span>
                <span className="font-semibold text-gray-800">
                  {course.lesson_count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Students
                </span>
                <span className="font-semibold text-gray-800">
                  {course.enrolled_count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Access
                </span>
                <span className="font-semibold text-gray-800">Lifetime</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-2 text-xs text-gray-500">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Certificate on completion
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                30-day money-back guarantee
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Access on mobile and desktop
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}