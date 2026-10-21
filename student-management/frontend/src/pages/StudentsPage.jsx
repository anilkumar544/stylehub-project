import { useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import Notice from "../components/Notice.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../services/api.js";

const emptyStudent = { name: "", email: "", phone: "", department: "", course: "" };

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyStudent);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadStudents() {
    try {
      setStudents(await api("/students"));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadStudents(); }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyStudent);
    setError("");
    setShowForm(true);
  }

  function startEdit(student) {
    setEditingId(student.id);
    setForm({ name: student.name, email: student.email, phone: student.phone, department: student.department, course: student.course });
    setError("");
    setShowForm(true);
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(editingId ? `/students/${editingId}` : "/students", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm(emptyStudent);
      setEditingId(null);
      await loadStudents();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(student) {
    if (!window.confirm(`Delete ${student.name}'s student record?`)) return;
    try {
      await api(`/students/${student.id}`, { method: "DELETE" });
      await loadStudents();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const visibleStudents = students.filter((student) =>
    [student.name, student.email, student.department, student.course].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        eyebrow="DIRECTORY"
        title="Students"
        description={`${students.length} student ${students.length === 1 ? "record" : "records"} in your directory.`}
        action={<button className="button button-primary" onClick={startCreate}><Plus size={17} /> Add student</button>}
      />
      <Notice>{error}</Notice>
      {showForm && (
        <section className="panel editor-panel">
          <div className="panel-heading"><div><span className="eyebrow">{editingId ? "UPDATE RECORD" : "NEW RECORD"}</span><h2>{editingId ? "Edit student" : "Add a student"}</h2></div><button className="icon-button" aria-label="Close form" onClick={() => setShowForm(false)}><X size={19} /></button></div>
          <form className="record-form" onSubmit={submit}>
            <label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={120} /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={254} /></label>
            <label>Phone number<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required minLength={5} maxLength={30} /></label>
            <label>Department<input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} required maxLength={120} /></label>
            <label>Course<input value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} required maxLength={120} /></label>
            <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add student"}</button></div>
          </form>
        </section>
      )}
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div><h2>Student directory</h2><p>Manage your campus community.</p></div>
          <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students" aria-label="Search students" /></label>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>STUDENT</th><th>PHONE</th><th>DEPARTMENT</th><th>COURSE</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {visibleStudents.map((student) => (
                <tr key={student.id}>
                  <td><div className="person-cell"><span className="avatar">{student.name.trim().charAt(0).toUpperCase()}</span><span><b>{student.name}</b><small>{student.email}</small></span></div></td>
                  <td>{student.phone}</td><td>{student.department}</td><td><span className="tag">{student.course}</span></td>
                  <td><div className="row-actions"><button className="text-button" onClick={() => startEdit(student)}>Edit</button><button className="text-button danger-text" onClick={() => removeStudent(student)}>Delete</button></div></td>
                </tr>
              ))}
              {visibleStudents.length === 0 && <tr><td colSpan="5" className="empty-state">{students.length ? "No students match your search." : "No student records yet. Add your first student to get started."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
