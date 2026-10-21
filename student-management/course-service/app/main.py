import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.config import STUDENT_SERVICE_URL
from app.models import Course, Enrollment
from app.schemas import CourseCreate, CourseOut, CourseUpdate, EnrollmentOut
from app.security import bearer_scheme, require_user

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Student Management - Course Service", version="1.0.0")


def save_course(course: Course, db: Session):
    db.add(course)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A course with this code already exists.")
    db.refresh(course)
    return course


@app.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    return save_course(Course(**payload.model_dump()), db)


@app.get("/courses", response_model=list[CourseOut])
def list_courses(
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    return db.scalars(select(Course).order_by(Course.name, Course.id)).all()


@app.get("/courses/{course_id}", response_model=CourseOut)
def get_course(
    course_id: int,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found.")
    return course


@app.put("/courses/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found.")
    for field, value in payload.model_dump().items():
        setattr(course, field, value)
    return save_course(course, db)


@app.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found.")
    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()
    db.delete(course)
    db.commit()


@app.post(
    "/courses/{course_id}/students/{student_id}",
    response_model=EnrollmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def enroll_student(
    course_id: int,
    student_id: int,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    if db.get(Course, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found.")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            student_response = await client.get(
                f"{STUDENT_SERVICE_URL.rstrip('/')}/students/{student_id}",
                headers={"Authorization": f"Bearer {credentials.credentials}"},
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="The student service is unavailable.") from exc
    if student_response.status_code == 404:
        raise HTTPException(status_code=404, detail="Student not found.")
    if student_response.status_code != 200:
        raise HTTPException(status_code=502, detail="The student service could not validate the student.")
    enrollment = Enrollment(course_id=course_id, student_id=student_id)
    db.add(enrollment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Student is already enrolled in this course.")
    return EnrollmentOut(student_id=student_id)


@app.get("/courses/{course_id}/students", response_model=list[EnrollmentOut])
def list_enrollments(
    course_id: int,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    if db.get(Course, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found.")
    enrollments = db.scalars(
        select(Enrollment).where(Enrollment.course_id == course_id).order_by(Enrollment.student_id)
    ).all()
    return [EnrollmentOut(student_id=enrollment.student_id) for enrollment in enrollments]


@app.delete(
    "/courses/{course_id}/students/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_enrollment(
    course_id: int,
    student_id: int,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    enrollment = db.scalar(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.student_id == student_id,
        )
    )
    if enrollment is None:
        raise HTTPException(status_code=404, detail="Enrollment not found.")
    db.delete(enrollment)
    db.commit()


@app.get("/health")
def health():
    return {"service": "courses", "status": "ok"}
