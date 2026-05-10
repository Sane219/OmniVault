import json
from robyn import SubRouter, Response
from api_core.db import supabase
from api_core.auth_utils import decode_token

user_router = SubRouter(__name__, prefix="/user")


@user_router.post("/api-key")
async def update_api_key(request):
    try:
        user_id, err = decode_token(request)
        if err:
            return err

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
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": str(e)}),
        )
