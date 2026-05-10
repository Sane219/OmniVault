import json
from robyn import SubRouter, Response
from api_core.db import supabase
from api_core.auth_utils import decode_token

user_router = SubRouter(__name__, prefix="/user")


@user_router.post("/api-key")
async def update_api_key(request):
    try:
        user_id = decode_token(request)
        if not user_id:
            return Response(status_code=401, headers={"Content-Type": "application/json"}, description='{"error": "Unauthorized"}')

        body = json.loads(request.body)
        api_key = body.get("api_key")

        if not api_key:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "api_key is required"}),
            )

        supabase.table("users").update({"gemini_api_key": api_key}).eq("id", user_id).execute()

        return Response(
            status_code=200,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"message": "API key updated successfully"}),
        )
    except Exception:
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": "Internal server error"}),
        )