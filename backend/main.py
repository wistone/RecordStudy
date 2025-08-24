from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from api import auth_supabase, records, analytics, resources, tags
from database import get_supabase_client
from utils.auth_utils import get_current_user

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Learning Tracker API...")
    yield
    # Shutdown
    print("Shutting down Learning Tracker API...")

app = FastAPI(
    title="学习搭子 API",
    description="Learning tracker backend API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_supabase.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(records.router, prefix="/api/records", tags=["Records"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
app.include_router(tags.router, prefix="/api/tags", tags=["Tags"])

# Mount static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Learning Tracker API is running"}

# Serve the main app
@app.get("/", response_class=HTMLResponse)
async def serve_app():
    with open("../frontend/index.html", "r", encoding="utf-8") as f:
        return f.read()

# Login page
@app.get("/login", response_class=HTMLResponse)
async def serve_login():
    with open("../frontend/login.html", "r", encoding="utf-8") as f:
        return f.read()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )