from hatchet_sdk import Hatchet
import asyncio

hatchet = Hatchet()

@hatchet.workflow(on_events=["ai:process"])
class AIProcessWorkflow:
    @hatchet.step()
    def process_data(self, context):
        print("Processing data from AI Worker...")
        return {"status": "success"}

async def main():
    worker = hatchet.worker("ai-worker")
    worker.register_workflow(AIProcessWorkflow())
    worker.start()

if __name__ == "__main__":
    asyncio.run(main())
