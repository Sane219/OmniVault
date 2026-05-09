import json
import jwt
import edgedb
from robyn import SubRouter, Response

user_router = SubRouter(__name__)

# Must match auth.py
JWT_SECRET = "super_secret_key_change_in_production"

@user_router.post("/api-key")
async def update_api_key(request):
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return Response(status_code=401, headers={"Content-Type": "application/json"}, description=json.dumps({"error": "Missing or invalid Authorization header"}))
        
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            email = payload.get("sub")
            if not email:
                raise ValueError("Invalid token payload")
        except Exception as e:
            return Response(status_code=401, headers={"Content-Type": "application/json"}, description=json.dumps({"error": f"Invalid token: {str(e)}"}))
        
        body = json.loads(request.body)
        api_key = body.get("api_key")
        
        if not api_key:
            return Response(status_code=400, headers={"Content-Type": "application/json"}, description=json.dumps({"error": "api_key is required"}))
            
        client = edgedb.create_client()
        
        # Update the user's API key
        query = """
        UPDATE User
        FILTER .email = <str>$email
        SET { gemini_api_key := <str>$api_key };
        """
        
        client.query(query, email=email, api_key=api_key)
        
        return Response(status_code=200, headers={"Content-Type": "application/json"}, description=json.dumps({"message": "API key updated successfully"}))
    except Exception as e:
        return Response(status_code=500, headers={"Content-Type": "application/json"}, description=json.dumps({"error": str(e)}))
