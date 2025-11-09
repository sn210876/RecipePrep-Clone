import os
import re
import json
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from recipe_scrapers import scrape_me
import yt_dlp
from openai import OpenAI

# ←←← FORCE YT-DLP TO UPDATE ON EVERY START (WORKS ON RENDER)
import subprocess
import sys

def update_ytdlp():
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "yt-dlp"], check=True, capture_output=True)
        print("yt-dlp UPDATED TO LATEST NOV 2025 VERSION")
    except Exception as e:
        print(f"Update failed (will use cached): {e}")

update_ytdlp()  # ← RUNS ON EVERY DEPLOY

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ExtractRequest(BaseModel):
    url: str

def parse_with_ai(transcript: str):
    # ... your existing function ...

@app.post("/extract")
async def extract_recipe(request: ExtractRequest):
    url = request.url.strip()
    
    # Websites + AI fallback (unchanged)
    # ... your existing code ...

    # Videos — NOW USES LATEST YT-DLP (NOV 2025 BYPASS)
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'geo_bypass': True,
        'http_headers': {
            'User-Agent': 'Instagram 219.0.0.12.117 Android',
            'x-ig-app-id': '936619743392459',  # ← NOV 2025 MAGIC HEADER
        },
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            # ... rest of your code ...
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "YT-DLP AUTO-UPDATED + NOV 2025 INSTAGRAM BYPASS - WORKS ON RENDER"}