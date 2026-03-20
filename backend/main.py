from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import auth as auth_router
from routers import policies as policies_router
from routers import workers as workers_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("GigShield API starting — scheduler placeholder")
    yield
    print("GigShield API shutting down")


app = FastAPI(
    title="GigShield API",
    version="1.0.0",
    description="Parametric income insurance for Zomato/Swiggy delivery partners",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(policies_router.router, prefix="/api/v1")
app.include_router(workers_router.router, prefix="/api/v1")


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
