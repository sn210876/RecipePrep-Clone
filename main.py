import os
import re
import json
import requests
import subprocess
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from recipe_scrapers import scrape_me
import yt_dlp
from openai import OpenAI

# FORCE UPDATE yt-dlp ON EVERY START (WORKS ON RENDER FREE TIER)
def update_ytdlp():
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "--upgrade", "--no-cache-dir", "yt-dlp"
        ])
        print("yt-dlp UPDATED TO LATEST NOV 2025 VERSION - IG + TIKTOK BYPASS ACTIVE")
    except Exception as e:
        print(f"yt-dlp update skipped (using cached): {e}")

update_ytdlp()

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

def parse_with_ai(text: str):
    if not text.strip():
        return [], [], ""
    
    prompt = f"""
    Extract a complete recipe from this text (caption, transcript, or HTML). Return ONLY valid JSON:
    {{
        "ingredients": ["1 cup flour", "2 eggs", "1 tsp salt"],
        "instructions": ["Preheat oven to 350°F", "Mix ingredients", "Bake 30 minutes"],
        "notes": "Any tips or extra info"
    }}
    Text:
    {text}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.2,
            max_tokens=1000
        )
        content = response.choices[0].message.content
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return (
                data.get("ingredients", []),
                data.get("instructions", []),
                data.get("notes", "")
            )
        return [], [], ""
    except Exception as e:
        print(f"OpenAI error: {e}")
        return [], [], ""

@app.post("/extract")
async def extract_recipe(request: ExtractRequest):
    url = request.url.strip()
    
    # CLOUDFLARE + ALLRECIPES BYPASS HEADERS
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
    }
    
    # TRY RECIPE-SCRAPERS FIRST (ALLRECIPES, BLOGS, BBC, SERIOUS EATS, etc.)
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
            "notes": "Scraped from website"
        }
    except Exception as e:
        print(f"Scrape failed: {e}")
    
    # AI FALLBACK FOR ANY WEBSITE (ALLRECIPES NEW FORMAT, CLOUDFLARE SITES, BLOGS)
    try:
        html = requests.get(url, headers=headers, timeout=20).text
        prompt = f"""
        Extract recipe from this HTML. Return ONLY valid JSON:
        {{
            "title": "Recipe name",
            "ingredients": ["1 cup flour"],
            "instructions": ["Step 1"],
            "image": "url or empty",
            "yield": "serves 4",
            "time": 30,
            "notes": ""
        }}
        HTML:
        {html[:20000]}
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
                "title": data.get("title", "AI Parsed Recipe"),
                "ingredients": data.get("ingredients", []),
                "instructions": data.get("instructions", []),
                "image": data.get("image", ""),
                "yield": data.get("yield", ""),
                "time": data.get("time", 0),
                "notes": "AI fallback from website HTML"
            }
    except Exception as e:
        print(f"AI HTML fallback failed: {e}")
    
    # VIDEOS: INSTAGRAM + TIKTOK + YOUTUBE (NOV 2025 BYPASS - NO COOKIES)
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'geo_bypass': True,
        'extract_flat': False,
        'http_headers': {
            'User-Agent': 'Instagram 219.0.0.12.117 Android',
            'x-ig-app-id': '936619743392459',
        },
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Video Recipe')
            description = info.get('description', '')
            thumbnail = info.get('thumbnail', '')
            duration = info.get('duration', 0) or 0
            
            transcript = ""
            if info.get('automatic_captions'):
                for lang in ['en', 'en-US', 'a.en']:
                    if lang in info['automatic_captions']:
                        subs = info['automatic_captions'][lang]
                        if subs:
                            sub_url = subs[0]['url']
                            sub_data = requests.get(sub_url, headers=headers).text
                            lines = [l.strip() for l in sub_data.split('\n') if not l.strip().isdigit() and '-->' not in l and l.strip()]
                            transcript = ' '.join(lines)
                            break
            
            full_text = f"{description}\n\n{transcript}".strip()
            ai_ingredients, ai_instructions, ai_notes = parse_with_ai(full_text)
            
            return {
                "title": title,
                "ingredients": ai_ingredients or [],
                "instructions": ai_instructions or [],
                "image": thumbnail,
                "yield": "",
                "time": duration,
                "notes": f"AI Extracted from {'Instagram' if 'instagram' in url else 'TikTok' if 'tiktok' in url else 'Video'} (Nov 2025 bypass): {ai_notes}"
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Video failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "FINAL UNIVERSAL EXTRACTOR - ALLRECIPES + BLOGS + IG + TIKTOK + AUTO YT-DLP UPDATE - NOV 8 2025"}