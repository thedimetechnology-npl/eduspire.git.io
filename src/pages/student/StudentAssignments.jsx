import { useEffect, useState } from "react";
import {
  ClipboardList, Upload, CheckCircle2, Clock, Search, Bell, BookmarkCheck, FileText,
} from "lucide-react";
import client from "../../api/client";
import { Spinner, Badge, Button, Textarea, EmptyState } from "../../components/ui/Kit";
import { Modal } from "../../components/ui/Modal";
import { formatDateTime, extractErrorMessage } from "../../utils/helpers";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "submitted", label: "Submitted" },
  { key: "graded", label: "Graded" },
];

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () => client.get("/assignments/my").then(({ data }) => setAssignments(data));
  useEffect(() => { load(); }, []);

  const openSubmit = (a) => {
    setActive(a);
    setNotes("");
    setFile(null);
    setError("");
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      let file_url = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await client.post("/assignments/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        file_url = data.url;
      }
      await client.post("/assignments/submit", { assignment_id: active.id, notes, file_url });
      setActive(null);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignments) return <Spinner />;

  const isOverdue = (due) => due && new Date(due) < new Date();

  const filtered = assignments.filter((a) => {
    if (tab === "pending" && (a.my_submission_id || isOverdue(a.due_date))) return false;
    if (tab === "submitted" && (!a.my_submission_id || a.my_score != null)) return false;
    if (tab === "graded" && a.my_score == null) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: assignments.length,
    pending: assignments.filter((a) => !a.my_submission_id && !isOverdue(a.due_date)).length,
    submitted: assignments.filter((a) => a.my_submission_id && a.my_score == null).length,
    graded: assignments.filter((a) => a.my_score != null).length,
  };

  return (
    // ==================== FULL-PAGE BACKGROUND ====================
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/stassign.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Readability veil — dark tint on left, white on right */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 via-white/45 to-white/90" />

      {/* ==================== CONTENT ==================== */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-bold text-[#0a1e5e]">Assignments</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                <Bell className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 rounded-lg bg-white/80 hover:bg-white transition shadow-sm">
                <BookmarkCheck className="w-4 h-4 text-gray-600" />
              </button>
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
                placeholder="Search assignments..."
                className="w-full sm:w-72 pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm">
              <EmptyState
                icon={ClipboardList}
                title={tab === "all" ? "No assignments yet" : `No ${tab} assignments`}
                description="Assignments from your enrolled courses will show up here."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <div
                  key={a.id}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_-12px_rgba(30,64,175,0.2)] transition-all flex flex-col sm:flex-row sm:items-center gap-4 p-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-[#0a1e5e] text-sm truncate">
                          {a.title}
                        </h3>
                        {a.my_submission_id ? (
                          a.my_score != null ? (
                            <Badge variant="emerald">
                              Graded: {a.my_score}/{a.max_score}
                            </Badge>
                          ) : (
                            <Badge variant="gold">Submitted</Badge>
                          )
                        ) : isOverdue(a.due_date) ? (
                          <Badge variant="danger">Overdue</Badge>
                        ) : (
                          <Badge variant="neutral">Pending</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{a.course_title}</p>
                      {a.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {a.description}
                        </p>
                      )}
                      {a.due_date && (
                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due {formatDateTime(a.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={a.my_submission_id ? "outline" : "primary"}
                    size="sm"
                    icon={a.my_submission_id ? CheckCircle2 : Upload}
                    onClick={() => openSubmit(a)}
                    className={`shrink-0 ${!a.my_submission_id
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : ""
                      }`}
                  >
                    {a.my_submission_id ? "Resubmit" : "Submit"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== SUBMIT MODAL ==================== */}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title}>
        <div className="space-y-4">
          <Textarea
            label="Notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for your teacher..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">
              Attach a file (optional)
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="text-sm w-full file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-600"
            />
            {file && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <FileText className="w-3 h-3" /> {file.name}
              </p>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            loading={submitting}
            onClick={submit}
          >
            Submit assignment
          </Button>
        </div>
      </Modal>
    </div>
  );
}