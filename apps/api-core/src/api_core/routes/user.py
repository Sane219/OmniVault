import json
import traceback
import sys
from robyn import SubRouter, Response
from api_core.db import supabase
from api_core.auth_utils import decode_token

user_router = SubRouter(__name__, prefix="/user")


@user_router.post("/api-key")
async def update_api_key(request):
    sys.stderr.write(f"API-KEY HIT: body={request.body[:200]}\n")
    sys.stderr.flush()
    
    try:
        body_str = request.body.decode() if isinstance(request.body, bytes) else str(request.body)
        sys.stderr.write(f"API-KEY REQUEST BODY: {body_str}\n")
        sys.stderr.flush()
        
        user_id = decode_token(request)
        if not user_id:
            sys.stderr.write("API-KEY DECODE TOKEN FAILED\n")
            sys.stderr.flush()
            return Response(status_code=401, headers={"Content-Type": "application/json"}, description='{"error": "Unauthorized or invalid token"}')

        sys.stderr.write(f"API-KEY AUTHENTICATED USER_ID: {user_id}\n")
        sys.stderr.flush()
        
        body = json.loads(request.body)
        api_key = body.get("api_key")

        if not api_key:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "api_key is required"}),
            )

        # Update the user's Gemini API key in Supabase
        supabase.table("users").update({"gemini_api_key": api_key}).eq("id", user_id).execute()

        return Response(
            status_code=200,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"message": "API key updated successfully"}),
        )
    except Exception:
        sys.stderr.write(f"API-KEY EXCEPTION: {traceback.format_exc()}\n")
        sys.stderr.flush()
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": str(traceback.format_exc())}),
        )