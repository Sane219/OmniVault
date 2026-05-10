import json
import bcrypt
import jwt
import datetime
from robyn import SubRouter, Response
from api_core.db import supabase
import os

auth_router = SubRouter(__name__)

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "super_secret_key_change_in_production")
REFRESH_SECRET = os.environ.get("REFRESH_SECRET", "super_secret_refresh_key_change_in_production")


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

        # Hash password
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # Check if user already exists
        existing = supabase.table("users").select("id").eq("email", email).execute()
        if existing.data:
            return Response(
                status_code=409,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Email already registered"}),
            )

        # Insert new user
        result = (
            supabase.table("users")
            .insert({"email": email, "password_hash": password_hash})
            .execute()
        )

        if not result.data:
            raise ValueError("User insert returned no data")

        return Response(
            status_code=201,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"message": "User registered successfully"}),
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

        # Fetch user from Supabase
        result = (
            supabase.table("users")
            .select("id, email, password_hash")
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if not result.data:
            return Response(
                status_code=401,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Invalid credentials"}),
            )

        user = result.data[0]

        # Verify password
        if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
            return Response(
                status_code=401,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "Invalid credentials"}),
            )

        # Generate Access Token (15 minutes) — sub carries the user UUID
        access_payload = {
            "sub": user["id"],
            "email": email,
            "aud": "authenticated",
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15),
        }
        access_token = jwt.encode(access_payload, SUPABASE_JWT_SECRET, algorithm="HS256")

        # Generate Refresh Token (7 days)
        refresh_payload = {
            "sub": user["id"],
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        }
        refresh_token = jwt.encode(refresh_payload, REFRESH_SECRET, algorithm="HS256")

        response = Response(
            status_code=200,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"access_token": access_token}),
        )

        # Set the HttpOnly Secure Refresh Token cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            secure=True,
            http_only=True,
            max_age=604800,  # 7 days
        )
        return response

    except Exception as e:
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": str(e)}),
        )
