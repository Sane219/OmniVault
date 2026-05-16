import os
import time
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()

from robyn import Robyn, ALLOW_CORS, Request, Response  # noqa: E402
from api_core.routes.auth import auth_router  # noqa: E402
from api_core.routes.upload import upload_router  # noqa: E402
from api_core.routes.user import user_router  # noqa: E402
from api_core.routes.document import document_router  # noqa: E402
from api_core.routes.chat import chat_router  # noqa: E402

app = Robyn(__file__)

# CORS - restrict to frontend origin in production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
ALLOW_CORS(app, origins=ALLOWED_ORIGINS)

# Rate limiting: {ip: [timestamps]}
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 60  # requests per window
AUTH_RATE_LIMIT_MAX = 10  # stricter for auth endpoints


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.headers.get("x-real-ip", "unknown")


def _is_rate_limited(ip: str, max_requests: int) -> bool:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if t > window_start]
    if len(_rate_limit_store[ip]) >= max_requests:
        return True
    _rate_limit_store[ip].append(now)
    return False


@app.before_request()
async def rate_limit_middleware(request: Request):
    """Rate limiting and OPTIONS skip."""
    if request.method == "OPTIONS":
        return request

    ip = _get_client_ip(request)
    path = request.url.path if hasattr(request, 'url') and request.url else ""

    max_req = AUTH_RATE_LIMIT_MAX if "/auth/" in path else RATE_LIMIT_MAX_REQUESTS
    if _is_rate_limited(ip, max_req):
        return Response(
            status_code=429,
            headers={"Content-Type": "application/json", "Retry-After": str(RATE_LIMIT_WINDOW)},
            description='{"error": "Too many requests. Please try again later."}',
        )
    return request

@app.options("/*extra")
async def handle_options(request: Request):
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
        description=""
    )
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(user_router)
app.include_router(document_router)
app.include_router(chat_router)


@app.get("/")
async def h(request):
    return "Hello from OmniVault API Core!"

if __name__ == "__main__":
    app.start(host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", 8080)))
