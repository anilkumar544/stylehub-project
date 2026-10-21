from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StudentFields(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=30)
    department: str = Field(min_length=1, max_length=120)
    course: str = Field(min_length=1, max_length=120)


class StudentCreate(StudentFields):
    pass


class StudentUpdate(StudentFields):
    pass


class StudentOut(StudentFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
