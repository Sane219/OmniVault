import json
import traceback
from robyn import SubRouter, Response
from api_core.db import supabase_auth

auth_router = SubRouter(__name__)


@auth_router.post("/register")
async def register(request):
    try:
        body = json.loads(request.body)
        body_str = request.body.decode() if isinstance(request.body, bytes) else str(request.body)
        print(f"REGISTER REQUEST BODY: {body_str}")
        
        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Email and password required"}),
            )

        print(f"REGISTER: Calling Supabase with email={email}, password=***")
        res = supabase_auth.auth.sign_up({"email": email, "password": password})
        print(f"REGISTER RESPONSE: user={res.user is not None}, session={getattr(res, 'session', None) is not None}")

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
    except Exception:
        print(f"REGISTER EXCEPTION: {traceback.format_exc()}")
        err_msg = str(traceback.format_exc())
        if "already been registered" in err_msg.lower():
            return Response(
                status_code=409,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "User already registered"}),
            )
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": str(traceback.format_exc())}),
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