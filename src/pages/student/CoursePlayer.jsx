import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Award,
  ArrowLeft,
} from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Button, Badge } from "../../components/ui/Kit";
import { mediaUrl } from "../../utils/media";

export default function CoursePlayer() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [marking, setMarking] = useState(false);
  const [mediaSource, setMediaSource] = useState("");
  const videoRef = useRef(null);
  const lastSavedPosition = useRef(0);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get(`/courses/${id}`);

      setCourse(data);

      setActiveLesson((prev) => {
        if (prev) {
          return (
            data.lessons.find((l) => l.id === prev.id) ||
            data.lessons.find((l) => !l.is_completed) ||
            data.lessons[0]
          );
        }

        return (
          data.lessons.find((l) => !l.is_completed) ||
          data.lessons[0]
        );
      });
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleComplete = async (lesson) => {
    setMarking(true);

    try {
      await client.post(`/lessons/${lesson.id}/progress`, {
        is_completed: !lesson.is_completed,
      });

      await load();
    } finally {
      setMarking(false);
    }
  };

  const saveVideoPosition = async (position, completed = activeLesson?.is_completed || false) => {
    if (!activeLesson || activeLesson.lesson_type !== "video") return;
    if (Math.abs(position - lastSavedPosition.current) < 2 && !completed) return;
    lastSavedPosition.current = position;
    await client.post(`/lessons/${activeLesson.id}/progress`, {
      is_completed: completed,
      position_seconds: Math.floor(position),
    });
  };

  useEffect(() => {
    lastSavedPosition.current = 0;
    if (videoRef.current) videoRef.current.currentTime = activeLesson?.position_seconds || 0;
    if (activeLesson?.lesson_type === "video" && activeLesson.content_url) {
      client.get(`/lessons/${activeLesson.id}/media-url`).then(({ data }) => {
        setMediaSource(mediaUrl(data.url));
      }).catch(() => setMediaSource(""));
    } else {
      setMediaSource("");
    }
  }, [activeLesson?.id, activeLesson?.position_seconds, activeLesson?.lesson_type, activeLesson?.content_url]);

  if (!course) {
    return (
      <Spinner />
    );
  }

  return (
    <>
      <Link
        to={`/course/${id}`}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Course overview
      </Link>

      {course.my_progress >= 100 && (
        <Card className="mb-6 bg-gold-soft border-gold-light flex items-center gap-3">
          <Award className="w-8 h-8 text-gold-dark shrink-0" />

          <div className="flex-1">
            <p className="font-medium text-ink">
              Course complete! Your certificate has been issued.
            </p>
          </div>

          <Link to="/student/certificates">
            <Button size="sm" variant="gold">
              View certificate
            </Button>
          </Link>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Lesson Viewer */}
        <Card className="min-h-[420px] flex flex-col">
          {activeLesson ? (
            <>
              <div
                className="aspect-video bg-ink rounded-xl flex items-center justify-center mb-5 cursor-pointer"
                onClick={() => {
                  if (activeLesson?.lesson_type !== "video" && activeLesson?.content_url) window.open(mediaUrl(activeLesson.content_url), "_blank");
                }}
              >
                {activeLesson.lesson_type === "video" && mediaSource ? (
                  <video
                    ref={videoRef}
                    src={mediaSource}
                    controls
                    className="w-full h-full rounded-xl object-contain"
                    onLoadedMetadata={(event) => {
                      const position = activeLesson.position_seconds || 0;
                      if (position < event.currentTarget.duration - 2) event.currentTarget.currentTime = position;
                    }}
                    onTimeUpdate={(event) => {
                      const position = event.currentTarget.currentTime;
                      if (position - lastSavedPosition.current >= 5) saveVideoPosition(position);
                    }}
                    onEnded={() => saveVideoPosition(videoRef.current?.duration || 0, true)}
                  />
                ) : activeLesson.lesson_type === "pdf" ? (
                  <FileText className="w-14 h-14 text-white/30" />
                ) : (
                  <PlayCircle className="w-14 h-14 text-white/30" />
                )}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="neutral" className="mb-2">
                    {activeLesson.lesson_type.toUpperCase()}
                  </Badge>

                  <h2 className="font-display text-xl font-semibold text-ink">
                    {activeLesson.title}
                  </h2>

                  <p className="text-sm text-muted mt-1">
                    {activeLesson.duration_minutes} minutes
                  </p>
                </div>

                <Button
                  variant={
                    activeLesson.is_completed ? "outline" : "primary"
                  }
                  size="sm"
                  loading={marking}
                  onClick={() => toggleComplete(activeLesson)}
                  icon={
                    activeLesson.is_completed
                      ? CheckCircle2
                      : Circle
                  }
                >
                  {activeLesson.is_completed
                    ? "Completed"
                    : "Mark complete"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">
              This course has no lessons yet.
            </p>
          )}
        </Card>

        {/* Lesson List */}
        <Card padded={false}>
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-ink text-sm">
              Lessons (
              {course.lessons.filter((l) => l.is_completed).length}/
              {course.lessons.length})
            </h3>
          </div>

          <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
            {course.lessons.map((lesson, i) => (
              <button
                key={lesson.id}
                onClick={() => {
                  setActiveLesson(lesson);

                  if (lesson.lesson_type !== "video" && lesson.content_url) {
                    window.open(mediaUrl(lesson.content_url), "_blank");
                  }
                }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left border-b border-border last:border-0 transition-colors ${activeLesson?.id === lesson.id
                  ? "bg-gold-soft"
                  : "hover:bg-paper"
                  }`}
              >
                {lesson.is_completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-light shrink-0" />
                )}

                <span className="text-sm text-text flex-1 line-clamp-1">
                  {i + 1}. {lesson.title}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}