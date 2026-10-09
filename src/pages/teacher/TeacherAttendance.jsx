import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Save, Calendar, Check, X, Clock,
} from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Select, Button, EmptyState } from "../../components/ui/Kit";
import { initials } from "../../utils/helpers";

export default function TeacherAttendance() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [liveClasses, setLiveClasses] = useState([]);
  const [liveClassId, setLiveClassId] = useState("");
  const [roster, setRoster] = useState(null);
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    client.get("/courses", { params: { mine: true } }).then(({ data }) => {
      setCourses(data);
      if (data.length > 0) setCourseId(String(data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setError("");
    client.get("/live-classes", { params: { course_id: courseId } }).then(({ data }) => {
      setLiveClasses(data);
      setLiveClassId(data.length > 0 ? String(data[0].id) : "");
    });
    client.get(`/courses/${courseId}/students`).then(({ data }) => {
      setRoster(data);
      setMarks(Object.fromEntries(data.map((e) => [e.student_id, "absent"])));
    });
    setSaved(false);
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !liveClassId || !roster) return;
    client.get(`/attendance/course/${courseId}`).then(({ data }) => {
      const sessionMarks = data.filter(
        (record) => String(record.live_class_id) === String(liveClassId)
      );
      setMarks((current) =>
        Object.fromEntries(
          roster.map((student) => [
            student.student_id,
            sessionMarks.find((record) => record.student_id === student.student_id)
              ?.status || current[student.student_id] || "absent",
          ])
        )
      );
    });
  }, [courseId, liveClassId, roster]);

  const submit = async () => {
    if (!liveClassId) return;
    setSaving(true);
    setError("");
    const records = Object.entries(marks).map(([student_id, status]) => ({
      student_id: Number(student_id),
      course_id: Number(courseId),
      status,
    }));
    try {
      await client.post("/attendance/mark", {
        course_id: Number(courseId),
        live_class_id: Number(liveClassId),
        records,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(
    () =>
      Object.values(marks).reduce(
        (result, status) => ({ ...result, [status]: result[status] + 1 }),
        { present: 0, late: 0, absent: 0 }
      ),
    [marks]
  );

  const statusStyles = {
    present: {
      active: "bg-emerald-500 text-white border-emerald-500",
      inactive: "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50",
      icon: Check,
    },
    late: {
      active: "bg-amber-500 text-white border-amber-500",
      inactive: "bg-white text-amber-600 border-amber-200 hover:bg-amber-50",
      icon: Clock,
    },
    absent: {
      active: "bg-rose-500 text-white border-rose-500",
      inactive: "bg-white text-rose-600 border-rose-200 hover:bg-rose-50",
      icon: X,
    },
  };

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/attend.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Right-side white gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/75 lg:to-white/90" />

      {/* ==================== CONTENT ==================== */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">

          {/* LEFT SPACER — image shows through */}
          <div className="hidden lg:block" />

          {/* RIGHT SIDE — Attendance marking */}
          <div className="lg:pl-4">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h1 className="text-2xl font-bold text-[#0a1e5e]">Attendance</h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {roster
                    ? `${roster.length} student${roster.length !== 1 ? "s" : ""}`
                    : "Loading..."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {courses.length > 0 && (
                  <Select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full sm:w-52"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </Select>
                )}
                {liveClasses.length > 0 && (
                  <Select
                    value={liveClassId}
                    onChange={(e) => setLiveClassId(e.target.value)}
                    className="w-full sm:w-52"
                  >
                    <option value="">Select session</option>
                    {liveClasses.map((lc) => (
                      <option key={lc.id} value={lc.id}>{lc.title}</option>
                    ))}
                  </Select>
                )}
              </div>
            </div>

            {/* Empty / Loading states */}
            {!roster ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <div className="py-16 flex justify-center"><Spinner /></div>
              </Card>
            ) : !liveClassId ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <EmptyState
                  icon={ShieldCheck}
                  title="Select a live class session"
                  description="Attendance is tied to a specific class so students get an accurate attendance history."
                />
              </Card>
            ) : roster.length === 0 ? (
              <Card padded={false} className="bg-white/95 backdrop-blur-sm">
                <EmptyState
                  icon={ShieldCheck}
                  title="No students enrolled"
                  description="Enroll students in this course before marking attendance."
                />
              </Card>
            ) : (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-[0_15px_40px_-12px_rgba(30,64,175,0.15)] overflow-hidden">

                {/* Summary bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      {counts.present} present
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      {counts.late} late
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      {counts.absent} absent
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMarks(Object.fromEntries(roster.map((s) => [s.student_id, "present"])))
                      }
                    >
                      Mark all present
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMarks(Object.fromEntries(roster.map((s) => [s.student_id, "absent"])))
                      }
                    >
                      Mark all absent
                    </Button>
                  </div>
                </div>

                {/* Roster rows */}
                <div className="divide-y divide-gray-100">
                  {roster.map((e) => (
                    <div
                      key={e.student_id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 hover:bg-blue-50/30 transition"
                    >
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(e.student_name || "S")}
                        </div>
                        <span className="text-sm font-semibold text-[#0a1e5e] truncate">
                          {e.student_name}
                        </span>
                      </div>

                      {/* Status toggles */}
                      <div className="flex gap-1.5 shrink-0">
                        {["present", "late", "absent"].map((status) => {
                          const isActive = marks[e.student_id] === status;
                          const style = statusStyles[status];
                          const Icon = style.icon;
                          return (
                            <button
                              key={status}
                              onClick={() =>
                                setMarks({ ...marks, [e.student_id]: status })
                              }
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                                isActive ? style.active : style.inactive
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer with save */}
                <div className="px-5 py-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    Session: <span className="font-semibold text-[#0a1e5e]">
                      {liveClasses.find((lc) => String(lc.id) === String(liveClassId))?.title || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {saved && (
                      <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" /> Saved!
                      </span>
                    )}
                    {error && <span className="text-sm text-rose-600">{error}</span>}
                    <Button
                      icon={saving ? undefined : Save}
                      loading={saving}
                      onClick={submit}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Save Attendance
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}