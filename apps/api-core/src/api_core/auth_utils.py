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
        
        # Try HS256 first (for custom JWT secret), fallback to RS256 (Supabase default)
        # Supabase can issue either depending on project config
        decoded = None
        for alg in ["HS256", "RS256"]:
            try:
                decoded = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=[alg],
                    options={"verify_aud": False}
                )
                break
            except jwt.exceptions.InvalidSignatureError:
                continue
            except Exception:
                continue
        
        if decoded is None:
            sys.stderr.write("ERROR: JWT verification failed with all algorithms\n")
            return None
        
        user_id = decoded.get("sub")
        return user_id

    except jwt.ExpiredSignatureError:
        sys.stderr.write("ERROR: JWT Token has EXPIRED\n")
    except jwt.InvalidSignatureError:
        sys.stderr.write("ERROR: JWT Signature is INVALID\n")
    except jwt.InvalidTokenError as e:
        sys.stderr.write(f"ERROR: JWT Token is invalid: {e}\n")
    except Exception as e:
        sys.stderr.write(f"ERROR: Unexpected error: {e}\n")

    return None