import { useCallback, useEffect, useState } from "react";
import {
  ScrollText, Bookmark, Download, Search, Bell, BookmarkCheck, Filter,
} from "lucide-react";
import client, { API_URL } from "../../api/client";
import { Card, Spinner, Button, EmptyState } from "../../components/ui/Kit";

const ORIGIN = API_URL.replace(/\/api$/, "");

const TABS = [
  { key: "all", label: "All Papers" },
  { key: "subject", label: "By Subject" },
  { key: "course", label: "By Course" },
];

export default function QuestionPapers() {
  const [papers, setPapers] = useState(null);
  const [tab, setTab] = useState("all");
  const [subject, setSubject] = useState("");

  const load = useCallback(() => {
    client.get("/question-papers", { params: subject ? { subject } : {} }).then(({ data }) => setPapers(data));
  }, [subject]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const toggleBookmark = async (id) => {
    await client.post(`/question-papers/${id}/bookmark`);
    load();
  };

  const counts = papers ? { all: papers.length, subject: papers.length, course: papers.length } : { all: 0, subject: 0, course: 0 };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-[#0a1e5e]">Previous Question Papers</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-gray-100 transition">
            <Bell className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition">
            <BookmarkCheck className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                tab === t.key
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-[15px] pb-3"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Search by subject..."
            className="w-full sm:w-80 pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Paper Grid */}
      {!papers ? (
        <Spinner />
      ) : papers.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No question papers found"
          description="Try a different subject, or check back once your teacher uploads some."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {papers.map((p) => (
            <Card key={p.id} className="flex flex-col hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <ScrollText className="w-5 h-5 text-blue-600" />
                </div>
                <button onClick={() => toggleBookmark(p.id)}>
                  <Bookmark className={`w-5 h-5 ${p.is_bookmarked ? "fill-blue-600 text-blue-600" : "text-gray-300"}`} />
                </button>
              </div>
              <h3 className="font-bold text-sm text-[#0a1e5e] leading-snug mb-1 line-clamp-2">{p.title}</h3>
              <p className="text-xs text-gray-500 mb-4">
                {p.subject}
                {p.year ? ` · ${p.year}` : ""}
              </p>
              <a href={`${ORIGIN}${p.file_url}`} target="_blank" rel="noreferrer" className="mt-auto">
                <Button size="sm" variant="outline" icon={Download} className="w-full">
                  Download PDF
                </Button>
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}