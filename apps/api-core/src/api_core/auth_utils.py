"""
Shared authentication utilities for OmniVault API Core.
"""
import jwt
import os
import sys

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")


def decode_token(request) -> str | None:
    """
    Extracts and validates the Bearer JWT from the Authorization header.
    Returns the user_id (string) on success, or None on failure.
    """
    if not SUPABASE_JWT_SECRET:
        sys.stderr.write("ERROR: SUPABASE_JWT_SECRET is MISSING\n")
        return None

    auth_header = None
    try:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if not auth_header:
            headers_dict = dict(request.headers)
            auth_header = headers_dict.get("Authorization") or headers_dict.get("authorization")
    except Exception as e:
        sys.stderr.write(f"ERROR: Failed to read headers: {e}\n")
        return None

    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    try:
        parts = auth_header.split(" ")
        token = parts[1]

        decoded = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_signature": True, "verify_aud": False, "verify_exp": True}
        )

        user_id = decoded.get("sub")
        return user_id

    except jwt.ExpiredSignatureError:
        sys.stderr.write("ERROR: JWT token expired\n")
        return None
    except jwt.InvalidSignatureError:
        sys.stderr.write("ERROR: JWT signature verification failed\n")
        return None
    except Exception as e:
        sys.stderr.write(f"ERROR: JWT decode failed: {e}\n")
        return None