# CampusDesk Student Management

A beginner-friendly student and course management app built as independently runnable FastAPI services, a routing API gateway, and a React/Vite frontend. The frontend sends all API traffic through the gateway; the authentication, student, and course services each own a separate SQLite database.

## Architecture

```text
React + Vite (5173)
        |
        | /api/*
        v
API Gateway (8000) ---- Authentication Service (8001) ---- auth.db
        |                Student Service (8002) ------------ students.db
        |                Course Service (8003) ------------- courses.db
        +---------------------------------------------------- courses.db
```

The course service records enrollments by student ID rather than creating a cross-database foreign key. When a student is enrolled, it verifies the ID with the student service using the caller's bearer token. JWTs are validated by the auth, student, and course services using the same configured signing secret.

## Requirements

- Python 3.10+
- Node.js 18+
- npm

## Configuration

From this directory, copy `.env.example` to `.env` and replace the placeholder signing key with a unique secret:

```powershell
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Paste the generated value into `SECRET_KEY` in `.env`. Keep `.env` private and do not commit it. All services load this file from the project directory. Service URLs, token lifetime, frontend origin, and database URLs can be configured there; the SQLite databases are created automatically on first service startup.

## Run locally on Windows

Open a terminal in `student-management` and install backend dependencies into one virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r auth-service\requirements.txt -r student-service\requirements.txt -r course-service\requirements.txt -r api-gateway\requirements.txt
```

Start each component in its own terminal. Activate the same environment in each terminal, `Set-Location` into the service folder, then run its command:

| Component | Folder | Command |
|---|---|---|
| Authentication service | `auth-service` | `python -m uvicorn app.main:app --reload --port 8001` |
| Student service | `student-service` | `python -m uvicorn app.main:app --reload --port 8002` |
| Course service | `course-service` | `python -m uvicorn app.main:app --reload --port 8003` |
| API gateway | `api-gateway` | `python -m uvicorn main:app --reload --port 8000` |

For example, in the authentication terminal:

```powershell
Set-Location auth-service
python -m uvicorn app.main:app --reload --port 8001
```

Start the frontend in another terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open the Vite URL (normally <http://localhost:5173>). Register an account, then add students and courses and enroll students in courses. To stop the app, press `Ctrl+C` in each terminal.

## API documentation and health checks

Each FastAPI app exposes Swagger UI and OpenAPI:

- Gateway: <http://127.0.0.1:8000/docs>
- Authentication: <http://127.0.0.1:8001/docs>
- Students: <http://127.0.0.1:8002/docs>
- Courses: <http://127.0.0.1:8003/docs>

The React app uses the gateway routes under `/api`. The gateway routes are:

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create a named account and issue JWT |
| POST | `/api/auth/login` | Sign in and issue JWT |
| GET | `/api/auth/me` | Get authenticated account |
| POST | `/api/students` | Create student |
| GET | `/api/students` | List students |
| GET/PUT/DELETE | `/api/students/{student_id}` | Read, update, or delete student |
| POST | `/api/courses` | Create course |
| GET | `/api/courses` | List courses |
| GET/PUT/DELETE | `/api/courses/{course_id}` | Read, update, or delete course |
| POST | `/api/courses/{course_id}/students/{student_id}` | Enroll student |
| GET | `/api/courses/{course_id}/students` | List enrolled student IDs |
| DELETE | `/api/courses/{course_id}/students/{student_id}` | Remove enrollment |

Student and course routes require `Authorization: Bearer <access_token>`. FastAPI's generated docs include request and response schemas. The Postman collection in `postman/collection.json` contains the main routes and saves the login token to a collection variable.

## Project structure

```text
student-management/
├── api-gateway/        # HTTP routing and upstream error handling
├── auth-service/       # User registration, password hashing, JWTs
├── course-service/     # Course catalog and student enrollments
├── frontend/           # React dashboard, student and course workflows
├── postman/            # API request collection
└── student-service/    # Student records
```

This learning project creates tables on startup. For production use, add database migrations, refresh/revocation token strategy, rate limiting, stronger operational logging, monitoring, and deployment-specific secrets management.
