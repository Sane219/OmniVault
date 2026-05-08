import json
import bcrypt
import jwt
import datetime
from robyn import SubRouter, Response

auth_router = SubRouter(__name__)

JWT_SECRET = "super_secret_key_change_in_production"
REFRESH_SECRET = "super_secret_refresh_key_change_in_production"

@auth_router.post("/register")
async def register(request):
    try:
        body = json.loads(request.body)
        email = body.get("email")
        password = body.get("password")
        
        if not email or not password:
            return Response(status_code=400, headers={"Content-Type": "application/json"}, description=json.dumps({"error": "Email and password required"}))
            
        # Here we would use edgedb to insert User and Workspace
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        _ = hashed_password # suppress unused warning
        
        return Response(status_code=201, headers={"Content-Type": "application/json"}, description=json.dumps({"message": "User registered successfully"}))
    except Exception as e:
        return Response(status_code=500, headers={"Content-Type": "application/json"}, description=json.dumps({"error": str(e)}))

@auth_router.post("/login")
async def login(request):
    try:
        body = json.loads(request.body)
        email = body.get("email")
        password = body.get("password")
        
        if not email or not password:
            return Response(status_code=400, headers={"Content-Type": "application/json"}, description=json.dumps({"error": "Email and password required"}))
            
        # Here we would fetch the user from EdgeDB and verify password
        # bcrypt.checkpw(password.encode('utf-8'), user_hashed_password.encode('utf-8'))
        
        # Generate Access Token (15 minutes)
        access_payload = {
            "sub": email,
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
        }
        access_token = jwt.encode(access_payload, JWT_SECRET, algorithm="HS256")
        
        # Generate Refresh Token (7 days)
        refresh_payload = {
            "sub": email,
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
        }
        refresh_token = jwt.encode(refresh_payload, REFRESH_SECRET, algorithm="HS256")
        
        response = Response(
            status_code=200, 
            headers={"Content-Type": "application/json"}, 
            description=json.dumps({"access_token": access_token})
        )

        # Set the HttpOnly Secure Refresh Token
        response.set_cookie(
            key="refresh_token", 
            value=refresh_token,
            secure=True,
            http_only=True,
            max_age=604800  # 7 days
        )
        return response
    except Exception as e:
        return Response(status_code=500, headers={"Content-Type": "application/json"}, description=json.dumps({"error": str(e)}))
