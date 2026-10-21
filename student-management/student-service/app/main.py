from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import Student
from app.schemas import StudentCreate, StudentOut, StudentUpdate
from app.security import require_user

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Student Management - Student Service", version="1.0.0")


@app.post("/students", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    student = Student(**payload.model_dump())
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A student with this email already exists.")
    db.refresh(student)
    return student


@app.get("/students", response_model=list[StudentOut])
def list_students(
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    return db.scalars(select(Student).order_by(Student.name, Student.id)).all()


@app.get("/students/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student


@app.put("/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found.")
    for field, value in payload.model_dump().items():
        setattr(student, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A student with this email already exists.")
    db.refresh(student)
    return student


@app.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    _: int = Depends(require_user),
    db: Session = Depends(get_db),
):
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found.")
    db.delete(student)
    db.commit()


@app.get("/health")
def health():
    return {"service": "students", "status": "ok"}
