import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import Notice from "../components/Notice.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../services/api.js";

export default function DashboardPage() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/students"), api("/courses")])
      .then(([studentData, courseData]) => {
        setStudents(studentData);
        setCourses(courseData);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <>
      <PageHeader eyebrow="OVERVIEW" title="Good to have you here." description="Here’s what’s happening across your campus today." />
      <Notice>{error}</Notice>
      <div className="stat-grid">
        <article className="stat-card">
          <div className="stat-icon stat-purple"><UsersRound size={21} /></div>
          <span className="stat-label">TOTAL STUDENTS</span>
          <strong>{students.length}</strong>
          <span className="stat-note">Student records in your directory</span>
        </article>
        <article className="stat-card">
          <div className="stat-icon stat-green"><BookOpen size={21} /></div>
          <span className="stat-label">AVAILABLE COURSES</span>
          <strong>{courses.length}</strong>
          <span className="stat-note">Courses available to students</span>
        </article>
      </div>
      <section className="panel welcome-panel">
        <div>
          <span className="eyebrow">YOUR CAMPUS, AT A GLANCE</span>
          <h2>Everything in its right place.</h2>
          <p>Keep student information up to date and make sure everyone is enrolled in the right courses.</p>
        </div>
        <div className="quick-links">
          <Link to="/students" className="quick-link"><span className="quick-icon"><UsersRound size={19} /></span><span><b>Student directory</b><small>Manage student records</small></span><ArrowUpRight size={17} /></Link>
          <Link to="/courses" className="quick-link"><span className="quick-icon"><BookOpen size={19} /></span><span><b>Course catalog</b><small>Manage courses and enrollments</small></span><ArrowUpRight size={17} /></Link>
        </div>
      </section>
    </>
  );
}
