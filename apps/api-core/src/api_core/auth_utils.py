"""
Shared authentication utilities for OmniVault API Core.
"""
import jwt
import os

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")


def decode_token(request) -> str | None:
    """
    Extracts and validates the Bearer JWT from the Authorization header.
    Returns the user_id (string) on success, or None on failure.
    Logs verbose diagnostics to stdout (visible in HF Spaces logs).
    """
    print("--- START JWT DECODE ---")

    if not SUPABASE_JWT_SECRET:
        print("ERROR: SUPABASE_JWT_SECRET is MISSING in environment variables!")
        return None

    # Robyn headers can be tricky — convert to a plain dict and do a case-insensitive search
    auth_header = None
    try:
        headers_dict = dict(request.headers)
        for key, value in headers_dict.items():
            if key.lower() == "authorization":
                auth_header = value
                break
    except Exception as e:
        print(f"ERROR: Failed to read request headers: {e}")
        return None

    print(f"Found Auth Header: {auth_header is not None}")

    if not auth_header or not auth_header.startswith("Bearer "):
        print(f"ERROR: Invalid or missing Authorization header. Header value: {auth_header}")
        print("--- END JWT DECODE (FAILED: no header) ---")
        return None

    try:
        parts = auth_header.split(" ")
        token = parts[1]
        print(f"Token extracted. Prefix chars: {token[:10]}...")

        decoded = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = decoded.get("sub")
        print(f"JWT Successfully Decoded! User ID: {user_id}")
        print("--- END JWT DECODE (SUCCESS) ---")
        return user_id

    except jwt.ExpiredSignatureError:
        print("ERROR: JWT Token has EXPIRED.")
    except jwt.InvalidSignatureError:
        print("ERROR: JWT Signature is INVALID. The SUPABASE_JWT_SECRET might be incorrect.")
    except jwt.InvalidAudienceError:
        print("ERROR: JWT Audience is INVALID. Expected 'authenticated'.")
    except jwt.InvalidTokenError as e:
        print(f"ERROR: JWT Token is invalid: {e}")
    except Exception as e:
        print(f"ERROR: Unexpected error decoding token: {e}")

    print("--- END JWT DECODE (FAILED) ---")
    return None
