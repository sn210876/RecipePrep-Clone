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

# CORS — ALLOWS BOLT, LOCALHOST, YOUR APP, EVERYTHING
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
    
    prompt = f"""
    Extract a complete recipe from this video transcript. Return ONLY valid JSON:
    {{
        "ingredients": ["1 cup flour", "2 eggs", "1 tsp salt"],
        "instructions": ["Preheat oven to 350°F", "Mix ingredients", "Bake 30 minutes"],
        "notes": "Any tips"
    }}
    Transcript:
    {transcript}
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
    
    # Websites
    try:
        scraper = scrape_me(url, wild_mode=True)
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
        print(f"Scrape failed: {e}")
    
    # Videos — INSTAGRAM + TIKTOK + YOUTUBE — NO COOKIES, MOBILE BYPASS
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'geo_bypass': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.instagram.com/',
            'Origin': 'https://www.instagram.com',
        },
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Video Recipe')
            description = info.get('description', '')
            transcript = ""
            
            if info.get('automatic_captions'):
                for lang in ['en', 'en-US']:
                    if lang in info['automatic_captions']:
                        subs = info['automatic_captions'][lang]
                        if subs:
                            sub_url = subs[0]['url']
                            sub_data = requests.get(sub_url).text
                            lines = [l.strip() for l in sub_data.split('\n') if not l.strip().isdigit() and '-->' not in l and l.strip()]
                            transcript = ' '.join(lines)
                            break
            
            full_text = f"{description}\n\n{transcript}".strip()
            ai_ingredients, ai_instructions, ai_notes = parse_with_ai(full_text)
            
            return {
                "title": title,
                "ingredients": ai_ingredients or [],
                "instructions": ai_instructions or [],
                "image": info.get('thumbnail', ''),
                "yield": "",
                "time": info.get('duration', 0) or 0,
                "notes": f"AI Extracted (Mobile Bypass): {ai_notes}\n\nTranscript: {full_text[:500]}..."
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "UNIVERSAL EXTRACTOR LIVE + CORS + INSTAGRAM MOBILE BYPASS - NOVEMBER 8 2025"}