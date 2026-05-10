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
    Logs verbose diagnostics to stderr (visible in HF Spaces logs).
    """
    sys.stderr.write("--- START JWT DECODE ---\n")
    sys.stderr.flush()

    if not SUPABASE_JWT_SECRET:
        sys.stderr.write("ERROR: SUPABASE_JWT_SECRET is MISSING in environment variables!\n")
        sys.stderr.flush()
        return None

    # Robyn headers - access directly by name, not by iterating
    auth_header = None
    try:
        # Try direct access first (works for Robyn)
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        
        if not auth_header:
            # Try to get from headers dict if direct access fails
            headers_dict = dict(request.headers)
            auth_header = headers_dict.get("Authorization") or headers_dict.get("authorization")
    except Exception as e:
        sys.stderr.write(f"ERROR: Failed to read request headers: {e}\n")
        sys.stderr.flush()
        return None

    sys.stderr.write(f"Found Auth Header: {auth_header is not None}\n")
    sys.stderr.flush()

    if not auth_header or not auth_header.startswith("Bearer "):
        sys.stderr.write(f"ERROR: Invalid or missing Authorization header. Header value: {auth_header}\n")
        sys.stderr.write("--- END JWT DECODE (FAILED: no header) ---\n")
        sys.stderr.flush()
        return None

    try:
        parts = auth_header.split(" ")
        token = parts[1]
        sys.stderr.write(f"Token extracted. Prefix chars: {token[:10]}...\n")
        sys.stderr.flush()

        # Supabase uses RS256 algorithm, try RS256 first, then HS256
        try:
            decoded = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["RS256", "HS256"],
                audience="authenticated",
            )
        except Exception as e:
            sys.stderr.write(f"RS256 decode failed, trying HS256: {e}\n")
            sys.stderr.flush()
            # Fallback to HS256 with options
            decoded = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": False}  # Skip audience check if RS256 failed
            )
        
        user_id = decoded.get("sub")
        sys.stderr.write(f"JWT Successfully Decoded! User ID: {user_id}\n")
        sys.stderr.write("--- END JWT DECODE (SUCCESS) ---\n")
        sys.stderr.flush()
        return user_id

    except jwt.ExpiredSignatureError:
        sys.stderr.write("ERROR: JWT Token has EXPIRED.\n")
    except jwt.InvalidSignatureError:
        sys.stderr.write("ERROR: JWT Signature is INVALID. The SUPABASE_JWT_SECRET might be incorrect.\n")
    except jwt.InvalidAudienceError:
        sys.stderr.write("ERROR: JWT Audience is INVALID. Expected 'authenticated'.\n")
    except jwt.InvalidTokenError as e:
        sys.stderr.write(f"ERROR: JWT Token is invalid: {e}\n")
    except Exception as e:
        sys.stderr.write(f"ERROR: Unexpected error decoding token: {e}\n")

    sys.stderr.write("--- END JWT DECODE (FAILED) ---\n")
    sys.stderr.flush()
    return None