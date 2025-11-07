from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import json
import requests
from bs4 import BeautifulSoup
import threading
import time

# ✅ Create FastAPI app at the top level (Render needs this)
app = FastAPI()

# ✅ Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ✅ Define input model
class ExtractRequest(BaseModel):
    url: str

# ✅ Root route (Render uses this for health checks)
@app.get("/")
def root():
    return {"status": "API is awake!"}

# ✅ Extract recipe endpoint
@app.post("/extract")
async def extract_recipe(req: ExtractRequest):
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        res = requests.get(req.url, headers=headers, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")
        text = soup.get_text()[:3000]

        prompt = f"""
        Extract recipe from this webpage text. 
        Reply ONLY valid JSON in this exact format:

        {{
          "title": "Name of Recipe",
          "ingredients": ["1 cup flour", "2 eggs"],
          "steps": ["1. Mix ingredients", "2. Bake for 30 minutes"],
          "time": "30 min",
          "serves": 4
        }}

        Text:
        {text}
        """

        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )

        content = completion.choices[0].message.content.strip()
        recipe = json.loads(content)

        return {
            "thumb": "https://via.placeholder.com/400x300?text=Recipe",
            "recipe": recipe,
            "transcript": text[:500],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ Background keep-alive (prevents Render sleep)
def keep_awake():
    while True:
        try:
            time.sleep(600)
            requests.get("https://recipeapi-py.onrender.com")
        except Exception:
            pass

threading.Thread(target=keep_awake, daemon=True).start()
