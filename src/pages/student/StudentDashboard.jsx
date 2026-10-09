import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, Award, ClipboardList, PlayCircle, Clock, ArrowRight,
  TrendingUp, Calendar, Star, Bell, ChevronRight,
} from "lucide-react";
import client from "../../api/client";
import { Spinner } from "../../components/ui/Kit";

export default function StudentDashboard() {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [liveClass, setLiveClass] = useState(null);
  const [userName, setUserName] = useState("Student");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [me, enrollments, certs, assigns, notifs, calendar] = await Promise.all([
          client.get("/users/me").catch(() => ({ data: {} })),
          client.get("/my-courses").catch(() => ({ data: [] })),
          client.get("/certificates/my").catch(() => ({ data: [] })),
          client.get("/assignments/my").catch(() => ({ data: [] })),
          client.get("/notifications/my").catch(() => ({ data: [] })),
          client.get("/calendar").catch(() => ({ data: [] })),
        ]);

        const firstName = me.data?.full_name?.split(" ")[0] || "Student";
        setUserName(firstName);

        setStats([
          { label: "Courses", value: enrollments.data.length, icon: BookOpen, color: "bg-blue-100 text-blue-600" },
          { label: "Enrolled", value: enrollments.data.filter((e) => e.status === "active").length, icon: PlayCircle, color: "bg-green-100 text-green-600" },
          { label: "Certificates", value: certs.data.length, icon: Award, color: "bg-purple-100 text-purple-600" },
          { label: "Assignments", value: assigns.data.length, icon: ClipboardList, color: "bg-orange-100 text-orange-600" },
        ]);

        const colors = ["bg-blue-600", "bg-purple-600", "bg-teal-600"];
        setCourses(
          enrollments.data.slice(0, 3).map((e, i) => ({
            id: e.course.id,
            title: e.course.title,
            category: e.course.category_name || "Course",
            progress: e.progress_percent || 0,
            color: colors[i % colors.length],
          }))
        );

        setAssignments(
          assigns.data.slice(0, 3).map((a) => ({
            id: a.id,
            title: a.title,
            due: a.due_date ? `Due: ${new Date(a.due_date).toLocaleDateString()}` : "No due date",
            status: a.my_submission_id ? "Submitted" : "Pending",
          }))
        );

        setNotifications(
          notifs.data.slice(0, 3).map((n) => ({
            id: n.id,
            title: n.title,
            time: n.created_at ? new Date(n.created_at).toLocaleString() : "",
            type: "🔔",
          }))
        );

        const next = calendar.data
          .filter((e) => e.type === "live_class" && new Date(e.date) > new Date())
          .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

        if (next) {
          const start = new Date(next.date);
          const end = new Date(start.getTime() + (next.duration_minutes || 60) * 60000);
          setLiveClass({
            title: next.title,
            course: next.course_title,
            time: `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            link: next.meeting_link,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || !stats) return <Spinner />;

  return (
    <div className="w-full">
      <div className="space-y-6">
        {/* HERO BANNER */}
        <div className="relative bg-gradient-to-r from-[#0a1e5e] via-[#1e3a8a] to-[#1e40af] rounded-3xl p-6 md:p-8 text-white overflow-hidden">
          <div className="relative z-10 max-w-lg">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome back, {userName}!
            </h1>
            <p className="text-sm md:text-base text-blue-100">
              Keep Learning, Keep Growing! Your knowledge is your power.
            </p>
          </div>
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-16 right-40 w-40 h-40 bg-white/5 rounded-full"></div>
          <div className="absolute right-4 bottom-0 top-0 w-32 md:w-56 hidden md:flex items-center justify-center">
            <div className="text-8xl">👩‍💻</div>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1e5e]">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CONTINUE LEARNING */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#0a1e5e]">Continue Learning</h2>
            <Link to="/student/my-courses" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {courses.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-3">You haven't enrolled in any courses yet.</p>
              <Link to="/student/catalog" className="inline-block bg-blue-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition">
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {courses.map((course) => (
                <Link key={course.id} to={`/student/learn/${course.id}`} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all">
                  <div className="relative h-32 bg-gradient-to-br from-[#0a1e5e] to-[#1e40af] flex items-center justify-center">
                    <PlayCircle className="w-10 h-10 text-white/40" />
                    <span className="absolute top-2 left-2 bg-white/90 text-[10px] font-semibold px-2 py-0.5 rounded-full text-gray-700">
                      {course.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm text-[#0a1e5e] mb-3 line-clamp-2">{course.title}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${course.color} rounded-full`} style={{ width: `${course.progress}%` }}></div>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-500">{course.progress}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* TWO COLUMN: ASSIGNMENTS + NOTIFICATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#0a1e5e]">Recent Assignments</h2>
              <Link to="/student/assignments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No assignments yet.</p>
              ) : (
                assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ClipboardList className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                        <p className="text-[10px] text-gray-500">{a.due}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${a.status === "Pending" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
                      {a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#0a1e5e]">Recent Notifications</h2>
              <Link to="/notifications" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">You're all caught up.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{n.type}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-800 leading-tight">{n.title}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* LIVE CLASS */}
        <section className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#0a1e5e]">Upcoming Live Class</h2>
            <Link to="/calendar" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {!liveClass ? (
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
                <PlayCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-[#0a1e5e]">No upcoming live classes</p>
                <p className="text-xs text-gray-600 mt-1">Check back later.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
                <PlayCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-[#0a1e5e]">{liveClass.title}</p>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> {liveClass.time}
                </p>
              </div>
              {liveClass.link && (
                <a href={liveClass.link} target="_blank" rel="noreferrer" className="bg-blue-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                  Join Class <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </section>
      </div>

      {/* RIGHT INFO PANEL
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Dashboard is the landing page after students log in. Provides an overview of enrolled courses, upcoming classes, assignments and quizzes.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Features</h3>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Overview stats</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Continue learning</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Upcoming live class</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Recent assignments</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Notifications</li>
              <li className="flex items-start gap-2"><span className="text-blue-600 mt-1">•</span> Quick navigation</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Navigation Flow</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>Login →</li>
              <li className="pl-3">Dashboard →</li>
              <li className="pl-6">Select module</li>
            </ul>
          </div>
        </div>
      </aside> */}
    </div>
  );
}