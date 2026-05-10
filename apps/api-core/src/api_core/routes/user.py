import json
import traceback
from robyn import SubRouter, Response
from api_core.db import supabase
from api_core.auth_utils import decode_token

user_router = SubRouter(__name__, prefix="/user")


@user_router.post("/api-key")
async def update_api_key(request):
    try:
        body_str = request.body.decode() if isinstance(request.body, bytes) else str(request.body)
        print(f"API-KEY REQUEST BODY: {body_str}")
        
        user_id = decode_token(request)
        if not user_id:
            print("API-KEY DECODE TOKEN FAILED")
            return Response(status_code=401, headers={"Content-Type": "application/json"}, description='{"error": "Unauthorized or invalid token"}')

        print(f"API-KEY AUTHENTICATED USER_ID: {user_id}")
        
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
    except Exception as e:
        print(f"API-KEY EXCEPTION: {traceback.format_exc()}")
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": str(e)}),
        )
