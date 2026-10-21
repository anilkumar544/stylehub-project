import { useEffect, useState } from "react";
import { BookOpen, Plus, X } from "lucide-react";
import Notice from "../components/Notice.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../services/api.js";

const emptyCourse = { name: "", code: "", description: "" };

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  const [form, setForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadData() {
    try {
      const [courseList, studentList] = await Promise.all([api("/courses"), api("/students")]);
      const enrollmentLists = await Promise.all(
        courseList.map((course) => api(`/courses/${course.id}/students`)),
      );
      setCourses(courseList);
      setStudents(studentList);
      setEnrollments(Object.fromEntries(courseList.map((course, index) => [course.id, enrollmentLists[index].map((entry) => entry.student_id)])));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(editingId ? `/courses/${editingId}` : "/courses", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyCourse);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function editCourse(course) {
    setEditingId(course.id);
    setForm({ name: course.name, code: course.code, description: course.description || "" });
    setShowForm(true);
    setError("");
  }

  async function removeCourse(course) {
    if (!window.confirm(`Delete ${course.name}?`)) return;
    try {
      await api(`/courses/${course.id}`, { method: "DELETE" });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function setEnrollment(courseId, studentId, enrolled) {
    try {
      await api(`/courses/${courseId}/students/${studentId}`, { method: enrolled ? "POST" : "DELETE" });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="LEARNING"
        title="Courses"
        description={`${courses.length} course ${courses.length === 1 ? "available" : "available"} to your students.`}
        action={<button className="button button-primary" onClick={() => { setEditingId(null); setForm(emptyCourse); setShowForm(true); }}><Plus size={17} /> Add course</button>}
      />
      <Notice>{error}</Notice>
      {showForm && (
        <section className="panel editor-panel">
          <div className="panel-heading"><div><span className="eyebrow">{editingId ? "UPDATE COURSE" : "NEW COURSE"}</span><h2>{editingId ? "Edit course" : "Add a course"}</h2></div><button className="icon-button" aria-label="Close form" onClick={() => setShowForm(false)}><X size={19} /></button></div>
          <form className="record-form" onSubmit={submit}>
            <label>Course name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={120} /></label>
            <label>Course code<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required maxLength={30} /></label>
            <label className="wide-field">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} rows={3} /></label>
            <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add course"}</button></div>
          </form>
        </section>
      )}
      <div className="course-grid">
        {courses.map((course) => (
          <article className="panel course-card" key={course.id}>
            <div className="course-top"><span className="course-icon"><BookOpen size={20} /></span><span className="tag">{course.code}</span></div>
            <h2>{course.name}</h2>
            <p>{course.description || "A course available in your campus catalog."}</p>
            <div className="course-meta">{(enrollments[course.id] || []).length} enrolled</div>
            <label className="enroll-select">Enroll a student
              <select value="" onChange={(event) => { if (event.target.value) setEnrollment(course.id, Number(event.target.value), true); }}>
                <option value="">Choose student…</option>
                {students.filter((student) => !(enrollments[course.id] || []).includes(student.id)).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
            </label>
            {(enrollments[course.id] || []).length > 0 && (
              <div className="enrollment-list">
                {(enrollments[course.id] || []).map((studentId) => {
                  const student = students.find((record) => record.id === studentId);
                  return <div className="enrollment-row" key={studentId}><span>{student?.name || `Student #${studentId}`}</span><button className="text-button danger-text" onClick={() => setEnrollment(course.id, studentId, false)}>Remove</button></div>;
                })}
              </div>
            )}
            <div className="course-actions"><button className="text-button" onClick={() => editCourse(course)}>Edit</button><button className="text-button danger-text" onClick={() => removeCourse(course)}>Delete</button></div>
          </article>
        ))}
        {courses.length === 0 && <div className="panel empty-courses">No courses yet. Add a course to get your catalog started.</div>}
      </div>
    </>
  );
}
