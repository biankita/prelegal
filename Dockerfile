# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build the Next.js static export ----------
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Python runtime serving the API + static frontend ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PRELEGAL_STATIC_DIR=/app/static \
    PRELEGAL_DB_PATH=/tmp/prelegal.db

WORKDIR /app

# Install uv (Python dependency manager). Pinned for reproducibility.
RUN pip install --no-cache-dir 'uv==0.5.18'

# Install Python deps first (cached layer)
COPY backend/pyproject.toml ./
RUN uv sync --no-dev --no-install-project

# Copy backend application
COPY backend/app ./app

# Copy the built static frontend
COPY --from=frontend-build /frontend/out /app/static

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"

CMD ["uv", "run", "--no-dev", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
