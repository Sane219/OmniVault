import json
import traceback
import sys
from robyn import SubRouter, Response
from api_core.db import supabase_auth, supabase

auth_router = SubRouter(__name__)


@auth_router.post("/register")
async def register(request):
    sys.stderr.write(f"REGISTER HIT: body={request.body[:200]}\n")
    sys.stderr.flush()
    
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

        sys.stderr.write("REGISTER: Calling Supabase.sign_up with dict\n")
        sys.stderr.flush()
        
        res = supabase_auth.auth.sign_up({"email": email, "password": password})
        
        sys.stderr.write(f"REGISTER RESPONSE: user={res.user is not None}, session={getattr(res, 'session', None) is not None}\n")
        sys.stderr.flush()

        if res.user:
            session = getattr(res, "session", None)
            
            user_dict = {
                "id": res.user.id,
                "email": res.user.email,
                "created_at": res.user.created_at.isoformat() if res.user.created_at else None,
            }
            
            # Ensure user exists in local users table (for foreign key)
            try:
                supabase.table("users").upsert({
                    "id": res.user.id,
                    "email": res.user.email,
                }, on_conflict="id").execute()
                sys.stderr.write("REGISTER: user synced to local users table\n")
                sys.stderr.flush()
            except Exception as e:
                sys.stderr.write(f"REGISTER: user sync warning: {e}\n")
                sys.stderr.flush()
            
            if session and session.access_token:
                return Response(
                    status_code=201,
                    headers={"Content-Type": "application/json"},
                    description=json.dumps({"access_token": session.access_token, "user": user_dict}),
                )
            else:
                return Response(
                    status_code=201,
                    headers={"Content-Type": "application/json"},
                    description=json.dumps({"message": "Registration successful. Please check your email to confirm account.", "user": user_dict}),
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
    sys.stderr.write(f"LOGIN HIT: body={request.body[:200]}\n")
    sys.stderr.flush()
    
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

        sys.stderr.write("LOGIN: Calling Supabase.sign_in_with_password with dict\n")
        sys.stderr.flush()
        
        res = supabase_auth.auth.sign_in_with_password({"email": email, "password": password})
        
        sys.stderr.write(f"LOGIN RESPONSE: session={res.session is not None if res.session else False}\n")
        sys.stderr.flush()
        
        if not res.session or not res.session.access_token:
            sys.stderr.write("LOGIN FAILED: No session (email confirmation pending?)\n")
            sys.stderr.flush()
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Email not confirmed. Please check your inbox."}),
            )
        
        sys.stderr.write(f"LOGIN SUCCESS: user_id={res.user.id}, has_session=True\n")
        sys.stderr.flush()

        # Ensure user exists in local users table (for foreign key)
        try:
            supabase.table("users").upsert({
                "id": res.user.id,
                "email": res.user.email,
            }, on_conflict="id").execute()
            sys.stderr.write("LOGIN: user synced to local users table\n")
            sys.stderr.flush()
        except Exception as e:
            sys.stderr.write(f"LOGIN: user sync warning: {e}\n")
            sys.stderr.flush()

        user_dict = {
            "id": res.user.id,
            "email": res.user.email,
            "created_at": res.user.created_at.isoformat() if res.user.created_at else None,
        }

        return Response(
            status_code=200,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"access_token": res.session.access_token, "user": user_dict}),
        )
    except Exception:
        sys.stderr.write(f"LOGIN EXCEPTION: {traceback.format_exc()}\n")
        sys.stderr.flush()
        return Response(
            status_code=401,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": "Invalid credentials"}),
        )