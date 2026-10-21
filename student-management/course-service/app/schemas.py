from pydantic import BaseModel, ConfigDict, Field


class CourseFields(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=1, max_length=30)
    description: str = Field(default="", max_length=500)


class CourseCreate(CourseFields):
    pass


class CourseUpdate(CourseFields):
    pass


class CourseOut(CourseFields):
    model_config = ConfigDict(from_attributes=True)

    id: int


class EnrollmentOut(BaseModel):
    student_id: int
