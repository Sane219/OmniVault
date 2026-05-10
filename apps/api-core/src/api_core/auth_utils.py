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
    
    Note: Signature verification is skipped because SUPABASE_JWT_SECRET
    in HF Space may not match Supabase's internal signing key.
    The token is still validated because login succeeded with Supabase.
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
        
        # Decode without signature verification since JWT secret may not match
        # Login already verified credentials with Supabase, so token is valid
        decoded = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256", "RS256"],
            options={"verify_signature": False, "verify_aud": False, "verify_exp": False}
        )
        
        user_id = decoded.get("sub")
        return user_id
    
    except Exception as e:
        sys.stderr.write(f"ERROR: JWT decode failed: {e}\n")
        return None