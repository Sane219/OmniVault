import json
import jwt
from robyn import SubRouter, Response
from api_core.db import supabase

user_router = SubRouter(__name__, prefix="/user")

# Must match auth.py
JWT_SECRET = "super_secret_key_change_in_production"


@user_router.post("/api-key")
async def update_api_key(request):
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return Response(
                status_code=401,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Missing or invalid Authorization header"}),
            )

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("sub")
            if not user_id:
                raise ValueError("Invalid token payload")
        except Exception as e:
            return Response(
                status_code=401,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": f"Invalid token: {str(e)}"}),
            )

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
