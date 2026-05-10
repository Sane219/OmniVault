"""
Shared authentication utilities for OmniVault API Core.
"""
import jwt
from robyn import Response
import json

import os

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "super_secret_key_change_in_production")


def decode_token(request) -> tuple[str | None, Response | None]:
    """
    Extracts and validates the Bearer JWT from the Authorization header.

    Returns (user_id, None) on success, or (None, error_response) on failure.
    user_id is the UUID string stored in the 'sub' claim (set at login).
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
        # Supabase uses HS256 and the 'authenticated' audience
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Token missing 'sub' claim")
        return user_id, None
    except Exception as e:
        return None, Response(
            status_code=401,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": f"Invalid token: {e}"}),
        )
