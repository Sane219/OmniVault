# ── Base image ────────────────────────────────────────────────────────────────
FROM python:3.12-slim

# ── System dependencies ────────────────────────────────────────────────────────
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Install uv ────────────────────────────────────────────────────────────────
RUN pip install --no-cache-dir uv

# ── Working directory ─────────────────────────────────────────────────────────
WORKDIR /app

# ── Copy monorepo ─────────────────────────────────────────────────────────────
COPY . /app

# ── Install all workspace dependencies ────────────────────────────────────────
# uv reads pyproject.toml + uv.lock at the root and installs
# both api-core and worker-ai packages into the shared venv.
RUN uv sync --frozen --no-dev

# ── Make startup script executable ───────────────────────────────────────────
RUN chmod +x start.sh

# ── Expose Hugging Face Spaces default port ───────────────────────────────────
EXPOSE 7860

# ── Entrypoint ────────────────────────────────────────────────────────────────
CMD ["./start.sh"]
