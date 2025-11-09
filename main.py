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
    if not transcript.strip():
        return [], [], ""
    # ... same as before ...

@app.post("/extract")
async def extract_recipe(request: ExtractRequest):
    url = request.url.strip()
    
    # === FIX 1: ALLRECIPES + CLOUDFLARE BYPASS ===
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
        'Sec-Fetch-Mode': 'navigate',
    }
    
    # Websites — FIXED ALLRECIPES NEW FORMAT
    try:
        scraper = scrape_me(url, wild_mode=True, headers=headers)
        data = scraper.to_json()
        return {
            "title": data.get("title", "Untitled"),
            "ingredients": data.get("ingredients", []),
            "instructions": (data.get("instructions") or "").split("\n"),
            "image": data.get("image", ""),
            "yield": data.get("yields", ""),
            "time": data.get("total_time", 0),
            "notes": ""
        }
    except Exception as e:
        print(f"Scrape failed (trying fallback): {e}")
    
    # === FIX 2: FALLBACK — FETCH HTML + PARSE WITH AI IF SCRAPER FAILS ===
    try:
        html = requests.get(url, headers=headers, timeout=15).text
        
        prompt = f"""
        Extract recipe from this HTML. Return ONLY valid JSON:
        {{
            "title": "Recipe name",
            "ingredients": ["1 cup flour", "2 eggs"],
            "instructions": ["Step 1", "Step 2"],
            "image": "url or empty",
            "yield": "4 servings",
            "time": 30,
            "notes": ""
        }}
        HTML:
        {html[:15000]}
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.1,
            max_tokens=800
        )
        content = response.choices[0].message.content
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return {
                "title": data.get("title", "AI Extracted Recipe"),
                "ingredients": data.get("ingredients", []),
                "instructions": data.get("instructions", []),
                "image": data.get("image", ""),
                "yield": data.get("yield", ""),
                "time": data.get("time", 0),
                "notes": "AI fallback parse (AllRecipes new format)"
            }
    except Exception as ai_e:
        print(f"AI fallback failed: {ai_e}")
    
    # Videos — SAME MOBILE BYPASS AS BEFORE
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'geo_bypass': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Referer': 'https://www.instagram.com/',
        },
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            # ... same as before ...
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "ALLRECIPES FIXED + AI FALLBACK + UNIVERSAL - NOV 8 2025"}