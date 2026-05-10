"""
Shared authentication utilities for OmniVault API Core.
"""
import jwt
import os

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "super_secret_key_change_in_production")


def decode_token(request) -> str | None:
    """
    Extracts and validates the Bearer JWT from the Authorization header.
    Returns the user_id (string) on success, or None on failure.
    Logs explicit errors to console so they show up in HF Spaces logs.
    """
    try:
        if not SUPABASE_JWT_SECRET or SUPABASE_JWT_SECRET == "super_secret_key_change_in_production":
            print("ERROR: SUPABASE_JWT_SECRET is not properly set in environment variables.")
            # We don't return None here immediately if we still want to allow development testing,
            # but usually it's better to log it. We'll proceed, but it's risky if the secret isn't right.

        # Robyn-compliant header extraction
        auth_header = None
        if "authorization" in request.headers:
            auth_header = request.headers["authorization"]
        elif "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            
        if not auth_header or not auth_header.startswith("Bearer "):
            print("ERROR: Missing or invalid Authorization header.")
            return None

        # Split safely
        parts = auth_header.split(" ")
        if len(parts) != 2:
            print(f"ERROR: Malformed Bearer token. Parts: {len(parts)}")
            return None
            
        token = parts[1]
        
        # Decode token
        decoded = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        user_id = decoded.get("sub")
        if not user_id:
            print("ERROR: Token missing 'sub' claim")
            return None
            
        return user_id

    except jwt.ExpiredSignatureError:
        print("ERROR: JWT Token has expired.")
        return None
    except jwt.InvalidTokenError as e:
        print(f"ERROR: Invalid JWT Token: {e}")
        return None
    except Exception as e:
        print(f"ERROR: Unexpected error decoding token: {e}")
        return None
