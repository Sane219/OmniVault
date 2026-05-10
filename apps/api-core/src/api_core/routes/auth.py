import json
from robyn import SubRouter, Response
from api_core.db import supabase

auth_router = SubRouter(__name__)


@auth_router.post("/register")
async def register(request):
    try:
        body = json.loads(request.body)
        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Email and password required"}),
            )

        res = supabase.auth.sign_up({"email": email, "password": password})

        if res.user:
            return Response(
                status_code=201,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"message": "User registered successfully", "user": res.user.model_dump()}),
            )
        else:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Failed to create user"}),
            )
    except Exception as e:
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": str(e)}),
        )


@auth_router.post("/login")
async def login(request):
    try:
        body = json.loads(request.body)
        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Email and password required"}),
            )

        res = supabase.auth.sign_in_with_password({"email": email, "password": password})

        return Response(
            status_code=200,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"access_token": res.session.access_token, "user": res.user.model_dump()}),
        )
    except Exception as e:
        print(f"Login failed: {e}")
        return Response(
            status_code=401,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": "Invalid credentials"}),
        )
