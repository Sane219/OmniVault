import json
import traceback
from robyn import SubRouter, Response
from api_core.db import supabase_auth

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

        res = supabase_auth.auth.sign_up({"email": email, "password": password})

        if res.user:
            session = getattr(res, "session", None)
            if session and session.access_token:
                return Response(
                    status_code=201,
                    headers={"Content-Type": "application/json"},
                    description=json.dumps({"access_token": session.access_token, "user": res.user.model_dump()}),
                )
            else:
                return Response(
                    status_code=201,
                    headers={"Content-Type": "application/json"},
                    description=json.dumps({"message": "Registration successful. Please check your email to confirm account.", "user": res.user.model_dump()}),
                )
        else:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Failed to create user"}),
            )
    except Exception as e:
        print(f"REGISTER EXCEPTION: {traceback.format_exc()}")
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": str(e)}),
        )


@auth_router.post("/login")
async def login(request):
    try:
        body = json.loads(request.body)
        body_str = request.body.decode() if isinstance(request.body, bytes) else str(request.body)
        print(f"LOGIN REQUEST BODY: {body_str}")
        
        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Email and password required"}),
            )

        res = supabase_auth.auth.sign_in_with_password({"email": email, "password": password})
        
        if not res.session or not res.session.access_token:
            print("LOGIN FAILED: No session (email confirmation pending?)")
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Email not confirmed. Please check your inbox."}),
            )
        
        print(f"LOGIN SUCCESS: user_id={res.user.id}, has_session=True")

        return Response(
            status_code=200,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"access_token": res.session.access_token, "user": res.user.model_dump()}),
        )
    except Exception:
        print(f"LOGIN EXCEPTION: {traceback.format_exc()}")
        return Response(
            status_code=401,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": "Invalid credentials"}),
        )