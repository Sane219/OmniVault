"""
Shared authentication utilities for OmniVault API Core.
"""
import jwt
from robyn import Response
import json

JWT_SECRET = "super_secret_key_change_in_production"


def decode_token(request) -> tuple[str | None, Response | None]:
    """
    Extracts and validates the Bearer JWT from the Authorization header.

    Returns (email, None) on success, or (None, error_response) on failure.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, Response(
            status_code=401,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": "Missing or invalid Authorization header"}),
        )
    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        email = payload.get("sub")
        if not email:
            raise ValueError("Token missing 'sub' claim")
        return email, None
    except Exception as e:
        return None, Response(
            status_code=401,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": f"Invalid token: {e}"}),
        )
