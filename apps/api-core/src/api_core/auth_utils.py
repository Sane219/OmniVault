"""
Shared authentication utilities for OmniVault API Core.
"""
import jwt
import os
import sys
import json
import base64

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
        
        # Decode JWT header to find algorithm
        try:
            header_b64 = token.split('.')[0]
            # Add padding if needed
            padding = 4 - len(header_b64) % 4
            if padding != 4:
                header_b64 += '=' * padding
            header = json.loads(base64.urlsafe_b64decode(header_b64))
            alg = header.get("alg", "HS256")
        except Exception:
            alg = "HS256"  # Default fallback

        # Verify with the correct algorithm
        decoded = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=[alg],
            options={"verify_aud": False}
        )
        
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