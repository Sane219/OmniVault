"""
WebSocket endpoint for real-time document processing updates.

Instead of client-side polling, the server pushes status changes to the client.
Uses Supabase polling (1s interval) as the backend mechanism.
"""
import asyncio
from api_core.db import supabase

# Registered on the app in main.py via register_ws_routes(app)


def register_ws_routes(app):
    """Register WebSocket routes on the Robyn app."""

    @app.websocket("/ws/document")
    async def document_ws(ws):
        """
        WebSocket endpoint for document processing updates.

        Connect: ws://host:8080/ws/document?id=<document_id>&token=<jwt>
        Sends:   { "status": "processing"|"completed"|"failed", "message": "...", "progress": 0-100 }
        Closes:  After sending a terminal status (completed or failed)
        """
        query = ws.query_params
        document_id = query.get("id")
        token = query.get("token")

        if not document_id or not token:
            await ws.send_json({"error": "Missing 'id' or 'token' query parameter"})
            await ws.close()
            return

        # Validate token by building a fake request-like object
        # decode_token expects request.headers, but we have query params
        # We'll verify the JWT directly
        try:
            import jwt
            import os
            secret = os.environ.get("SUPABASE_JWT_SECRET", "")
            decoded = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_signature": bool(secret), "verify_aud": False, "verify_exp": True})
            user_id = decoded.get("sub")
            if not user_id:
                raise ValueError("No sub claim")
        except Exception:
            await ws.send_json({"error": "Invalid or expired token"})
            await ws.close()
            return

        # Poll Supabase for status changes
        last_status = None
        last_message = None

        try:
            while True:
                try:
                    result = await asyncio.to_thread(
                        lambda: supabase.table("documents")
                        .select("status, error_message, file_path")
                        .eq("id", document_id)
                        .eq("owner_id", user_id)
                        .limit(1)
                        .execute()
                    )

                    if not result.data:
                        await ws.send_json({"error": "Document not found"})
                        await ws.close()
                        return

                    doc = result.data[0]
                    status = doc["status"].lower()
                    error_message = doc.get("error_message")
                    file_path = doc.get("file_path")

                    # Build status message
                    if status == "completed":
                        message = "Processing complete. Knowledge graph generated."
                        progress = 100
                    elif status == "failed":
                        message = error_message or "Processing failed."
                        progress = 0
                    elif status == "processing":
                        message = "Extracting knowledge graph & AI insights..."
                        progress = 50
                    else:
                        message = "Document uploaded, waiting to process..."
                        progress = 5

                    # Only send if something changed
                    if status != last_status or message != last_message:
                        payload = {
                            "status": status,
                            "message": message,
                            "progress": progress,
                        }
                        if file_path:
                            payload["file_path"] = file_path
                        if error_message and status == "failed":
                            payload["error_message"] = error_message

                        await ws.send_json(payload)
                        last_status = status
                        last_message = message

                    # Close on terminal states
                    if status in ("completed", "failed"):
                        await ws.close()
                        return

                except Exception as e:
                    # Non-fatal — retry on next tick
                    print(f"[WS] Poll error for {document_id}: {e}")

                await asyncio.sleep(1)

        except Exception:
            # Client disconnected
            pass
