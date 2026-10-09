import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import client from "../../api/client";
// REMOVED: import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, Button, Input, Textarea } from "../../components/ui/Kit";
import { useAuth } from "../../context/useAuth";
import { initials, roleLabel } from "../../utils/helpers";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [basics, setBasics] = useState({ full_name: "", phone: "" });
  const [studentProfile, setStudentProfile] = useState({ date_of_birth: "", address: "", bio: "" });
  const [teacherProfile, setTeacherProfile] = useState({ subjects: [], experience_years: 0, qualifications: "", bio: "" });
  const [subjectInput, setSubjectInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.get("/users/me")
      .then(({ data }) => {
        setBasics({ full_name: data.full_name, phone: data.phone || "" });
        if (data.student_profile) setStudentProfile({ date_of_birth: data.student_profile.date_of_birth || "", address: data.student_profile.address || "", bio: data.student_profile.bio || "" });
        if (data.teacher_profile) setTeacherProfile(data.teacher_profile);
      })
      .catch(() => setError(true));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await client.put("/users/me", basics);
      updateUser(data);
      if (user.role === "student") await client.put("/users/me/student-profile", studentProfile).catch(() => {});
      if (user.role === "teacher") await client.put("/users/me/teacher-profile", teacherProfile).catch(() => {});
    } catch (e) {
      // error handled globally
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addSubject = () => {
    if (subjectInput.trim()) {
      setTeacherProfile({ ...teacherProfile, subjects: [...teacherProfile.subjects, subjectInput.trim()] });
      setSubjectInput("");
    }
  };

  const clampExperienceYears = (value) => {
    if (value === "") return 0;
    const num = Number(value);
    if (Number.isNaN(num)) return 0;
    return Math.min(Math.max(num, 0), 9999);
  };

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <Card className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-ink text-white flex items-center justify-center text-xl font-semibold shrink-0">
          {initials(user?.full_name)}
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-ink">{user?.full_name}</p>
          <p className="text-sm text-muted">{roleLabel(user?.role)} · {user?.email}</p>
        </div>
      </Card>

      <Card>
        <h3 className="font-display font-semibold text-ink mb-4">Basic information</h3>
        <div className="space-y-4">
          <Input label="Full name" value={basics.full_name} onChange={(e) => setBasics({ ...basics, full_name: e.target.value })} />
          <Input label="Phone" value={basics.phone} onChange={(e) => setBasics({ ...basics, phone: e.target.value })} />
        </div>
      </Card>

      {user?.role === "student" && (
        <Card>
          <h3 className="font-display font-semibold text-ink mb-4">Student details</h3>
          <div className="space-y-4">
            <Input label="Date of birth" type="date" value={studentProfile.date_of_birth} onChange={(e) => setStudentProfile({ ...studentProfile, date_of_birth: e.target.value })} />
            <Input label="Address" value={studentProfile.address} onChange={(e) => setStudentProfile({ ...studentProfile, address: e.target.value })} />
            <Textarea label="Bio" rows={3} value={studentProfile.bio} onChange={(e) => setStudentProfile({ ...studentProfile, bio: e.target.value })} />
          </div>
        </Card>
      )}

      {user?.role === "teacher" && (
        <Card>
          <h3 className="font-display font-semibold text-ink mb-4">Teacher details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Subjects</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {teacherProfile.subjects.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-gold-soft text-gold-dark text-xs font-medium px-2.5 py-1 rounded-full">
                    {s}
                    <button type="button" onClick={() => setTeacherProfile({ ...teacherProfile, subjects: teacherProfile.subjects.filter((_, idx) => idx !== i) })}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="Add a subject..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())} />
                <Button type="button" variant="outline" onClick={addSubject}>Add</Button>
              </div>
            </div>
            <Input
              label="Years of experience"
              type="number"
              min="0"
              max="9999"
              maxLength={4}
              value={teacherProfile.experience_years}
              onChange={(e) => setTeacherProfile({ ...teacherProfile, experience_years: clampExperienceYears(e.target.value) })}
            />
            <Input label="Qualifications" value={teacherProfile.qualifications || ""} onChange={(e) => setTeacherProfile({ ...teacherProfile, qualifications: e.target.value })} />
            <Textarea label="Bio" rows={3} value={teacherProfile.bio || ""} onChange={(e) => setTeacherProfile({ ...teacherProfile, bio: e.target.value })} />
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" icon={Save} loading={saving}>Save changes</Button>
        {saved && <span className="text-sm text-emerald font-medium">Saved!</span>}
      </div>
    </form>
  );
}