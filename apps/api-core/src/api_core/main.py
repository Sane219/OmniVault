import os
from dotenv import load_dotenv

load_dotenv()

from robyn import Robyn  # noqa: E402
from api_core.routes.auth import auth_router  # noqa: E402
from api_core.routes.upload import upload_router  # noqa: E402
from api_core.routes.user import user_router  # noqa: E402
from api_core.routes.document import document_router  # noqa: E402
from api_core.routes.chat import chat_router  # noqa: E402

app = Robyn(__file__)
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(user_router, prefix="/user")
app.include_router(document_router)
app.include_router(chat_router)


@app.get("/")
async def h(request):
    return "Hello from OmniVault API Core!"

if __name__ == "__main__":
    app.start(host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", 8080)))
