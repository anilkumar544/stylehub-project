import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

load_dotenv()

SERVICES = {
    "auth": os.getenv("AUTH_SERVICE_URL", "http://127.0.0.1:8001"),
    "students": os.getenv("STUDENT_SERVICE_URL", "http://127.0.0.1:8002"),
    "courses": os.getenv("COURSE_SERVICE_URL", "http://127.0.0.1:8003"),
}
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
FORWARDED_HEADERS = {"authorization", "content-type", "accept"}

app = FastAPI(title="Student Management API Gateway", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.api_route(
    "/api/{service}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
@app.api_route(
    "/api/{service}/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy(service: str, request: Request, path: str = ""):
    upstream = SERVICES.get(service)
    if upstream is None:
        raise HTTPException(status_code=404, detail="Unknown API service.")
    target = f"{upstream.rstrip('/')}/{service}"
    if path:
        target = f"{target}/{path}"
    if request.url.query:
        target = f"{target}?{request.url.query}"
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() in FORWARDED_HEADERS
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            upstream_response = await client.request(
                request.method,
                target,
                headers=headers,
                content=await request.body(),
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"The {service} service is unavailable.",
        ) from exc
    response_headers = {
        key: value
        for key, value in upstream_response.headers.items()
        if key.lower() in {"content-type", "www-authenticate"}
    }
    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=response_headers,
    )


@app.get("/health")
async def health():
    return {"service": "api-gateway", "status": "ok"}
