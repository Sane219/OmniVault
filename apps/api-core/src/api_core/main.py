from dotenv import load_dotenv

load_dotenv()

from robyn import Robyn  # noqa: E402
from api_core.routes.auth import auth_router  # noqa: E402
from api_core.routes.upload import upload_router  # noqa: E402

app = Robyn(__file__)
app.include_router(auth_router)
app.include_router(upload_router)


@app.get("/")
async def h(request):
    return "Hello from OmniVault API Core!"

if __name__ == "__main__":
    app.start(port=8080)
