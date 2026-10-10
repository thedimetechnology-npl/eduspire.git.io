import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, GripVertical, Trash2, Save, ArrowLeft, Eye, EyeOff } from "lucide-react";
import client from "../../api/client";
// REMOVED: import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, Button, Input, Textarea, Select, Badge } from "../../components/ui/Kit";
import { Modal } from "../../components/ui/Modal";
import { extractErrorMessage } from "../../utils/helpers";

const emptyLesson = { title: "", lesson_type: "video", content_url: "", duration_minutes: 10, order_index: 0 };

export default function CourseBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [tab, setTab] = useState("details");
  const [categories, setCategories] = useState([]);
  const [course, setCourse] = useState({ title: "", description: "", category_id: "", price: 0, level: "beginner" });
  const [lessons, setLessons] = useState([]);
  const [courseId, setCourseId] = useState(id ? Number(id) : null);
  const [lessonModal, setLessonModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [courseStatus, setCourseStatus] = useState("draft");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    client.get("/categories").then(({ data }) => setCategories(data));
    if (isEdit) {
      client.get(`/courses/${id}`).then(({ data }) => {
        setCourse({ title: data.title, description: data.description || "", category_id: data.category_id || "", price: data.price, level: data.level });
        setLessons(data.lessons);
        setCourseStatus(data.status || "draft");
      });
    }
  }, [id, isEdit]);

  const saveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...course, category_id: course.category_id || null, price: Number(course.price) };
      if (courseId) {
        await client.put(`/courses/${courseId}`, payload);
      } else {
        const { data } = await client.post("/courses", payload);
        setCourseId(data.id);
        navigate(`/teacher/courses/${data.id}/edit`, { replace: true });
      }
      setTab("lessons");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openNewLesson = () => setLessonModal({ ...emptyLesson, order_index: lessons.length });
  const saveLesson = async () => {
    if (lessonModal.id) {
      await client.put(`/lessons/${lessonModal.id}`, lessonModal);
    } else {
      await client.post(`/courses/${courseId}/lessons`, lessonModal);
    }
    const { data } = await client.get(`/courses/${courseId}`);
    setLessons(data.lessons);
    setCourseStatus(data.status || courseStatus);
    setLessonModal(null);
  };

  const togglePublish = async () => {
    if (!courseId || publishing) return;
    setPublishing(true);
    setError("");
    try {
      const { data } = await client.patch(`/courses/${courseId}/publish`, null, {
        params: { publish: courseStatus !== "published" },
      });
      setCourseStatus(data.status);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  const uploadVideo = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await client.post("/lessons/upload", body, {
        onUploadProgress: (event) => {
          if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      setLessonModal((current) => ({ ...current, lesson_type: "video", content_url: data.url }));
    } finally {
      setUploading(false);
    }
  };

  const deleteLesson = async (lessonId) => {
    await client.delete(`/lessons/${lessonId}`);
    setLessons(lessons.filter((l) => l.id !== lessonId));
  };

  return (
    <>
      <button onClick={() => navigate("/teacher/courses")} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to courses
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">{isEdit ? "Edit course" : "Create a new course"}</h1>
        {courseId && (
          <div className="flex items-center gap-2">
            <Badge variant={courseStatus === "published" ? "emerald" : "neutral"}>
              {courseStatus === "published" ? "Published" : "Draft"}
            </Badge>
            <Button
              size="sm"
              variant={courseStatus === "published" ? "outline" : "primary"}
              loading={publishing}
              icon={courseStatus === "published" ? EyeOff : Eye}
              onClick={togglePublish}
            >
              {courseStatus === "published" ? "Unpublish" : "Publish course"}
            </Button>
          </div>
        )}
      </div>

      {courseId && courseStatus !== "published" && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This course is a <b>draft</b> — students cannot see it yet. Click <b>Publish course</b> when it&apos;s ready.
        </div>
      )}

      {error && <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex gap-2 mb-6">
        <TabButton active={tab === "details"} onClick={() => setTab("details")}>Course details</TabButton>
        <TabButton active={tab === "lessons"} onClick={() => courseId && setTab("lessons")} disabled={!courseId}>
          Lessons {lessons.length > 0 && `(${lessons.length})`}
        </TabButton>
      </div>

      {tab === "details" && (
        <Card className="max-w-2xl">
          <form onSubmit={saveDetails} className="space-y-4">
            <Input label="Course title" required value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
            <Textarea label="Description" rows={4} value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Category" value={course.category_id} onChange={(e) => setCourse({ ...course, category_id: e.target.value })}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label="Level" value={course.level} onChange={(e) => setCourse({ ...course, level: e.target.value })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </div>
            <Input label="Price (USD, 0 for free)" type="number" min="0" step="0.01" value={course.price} onChange={(e) => setCourse({ ...course, price: e.target.value })} />
            <Button type="submit" loading={saving} icon={Save}>{courseId ? "Save details" : "Create & continue"}</Button>
          </form>
        </Card>
      )}

      {tab === "lessons" && courseId && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" icon={Plus} onClick={openNewLesson}>Add lesson</Button>
          </div>
          <Card padded={false}>
            {lessons.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">No lessons yet — add your first one.</p>
            ) : (
              lessons.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-0">
                  <GripVertical className="w-4 h-4 text-muted-light shrink-0" />
                  <span className="text-sm text-muted w-5">{i + 1}.</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">{l.title}</p>
                    <p className="text-xs text-muted">{l.duration_minutes} min</p>
                  </div>
                  <Badge variant="neutral">{l.lesson_type}</Badge>
                  <button onClick={() => setLessonModal(l)} className="text-xs text-gold-dark font-medium hover:underline">Edit</button>
                  <button onClick={() => deleteLesson(l.id)} className="p-1.5 text-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      <Modal open={!!lessonModal} onClose={() => setLessonModal(null)} title={lessonModal?.id ? "Edit lesson" : "Add lesson"}>
        {lessonModal && (
          <div className="space-y-4">
            <Input label="Lesson title" required value={lessonModal.title} onChange={(e) => setLessonModal({ ...lessonModal, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Type" value={lessonModal.lesson_type} onChange={(e) => setLessonModal({ ...lessonModal, lesson_type: e.target.value })}>
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="ppt">PPT</option>
              </Select>
              <Input label="Duration (min)" type="number" min="0" value={lessonModal.duration_minutes} onChange={(e) => setLessonModal({ ...lessonModal, duration_minutes: Number(e.target.value) })} />
            </div>
            {lessonModal.lesson_type === "video" && (
              <label className="block">
                <span className="block text-sm font-medium text-text mb-1.5">Upload video</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  disabled={uploading}
                  onChange={(e) => uploadVideo(e.target.files?.[0])}
                  className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-gold-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
                />
                <span className="block text-xs text-muted mt-1">Upload up to 500MB, or use a hosted video URL below.</span>
                {uploading && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted mb-1"><span>Uploading video</span><span>{uploadProgress}%</span></div>
                    <div className="h-2 rounded-full bg-paper overflow-hidden"><div className="h-full bg-gold transition-all" style={{ width: `${uploadProgress}%` }} /></div>
                  </div>
                )}
              </label>
            )}
            <Input label="Content URL" placeholder="https://... or uploaded video" value={lessonModal.content_url || ""} onChange={(e) => setLessonModal({ ...lessonModal, content_url: e.target.value })} />
            <Button className="w-full" loading={uploading} onClick={saveLesson}>Save lesson</Button>
          </div>
        )}
      </Modal>
    </>
  );
}

function TabButton({ active, children, ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 ${active ? "bg-ink text-white" : "bg-surface text-text border border-border hover:bg-paper"}`}
      {...props}
    >
      {children}
    </button>
  );
}