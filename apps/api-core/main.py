from robyn import Robyn

app = Robyn(__file__)

@app.get("/")
async def h(request):
    return "Hello from OmniVault API Core!"

if __name__ == "__main__":
    app.start(port=8080)
