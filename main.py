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
    
    # === WEBSITES: ALLRECIPES + CLOUDFLARE BYPASS ===
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
        'Sec-Fetch-Mode': 'navigate',
    }
    
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
        print(f"Scrape failed: {e}")
    
    # === AI FALLBACK FOR ANY WEBSITE ===
    try:
        html = requests.get(url, headers=headers, timeout=15).text
        prompt = f"""
        Extract recipe from this HTML. Return ONLY valid JSON:
        {{
            "title": "Recipe name",
            "ingredients": ["1 cup flour"],
            "instructions": ["Step 1"],
            "image": "",
            "yield": "",
            "time": 0,
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
                "title": data.get("title", "AI Extracted"),
                "ingredients": data.get("ingredients", []),
                "instructions": data.get("instructions", []),
                "image": data.get("image", ""),
                "yield": data.get("yield", ""),
                "time": data.get("time", 0),
                "notes": "AI fallback"
            }
    except Exception as e:
        print(f"AI fallback failed: {e}")
    
    # === VIDEOS: INSTAGRAM + TIKTOK + YOUTUBE (NO COOKIES) ===
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'geo_bypass': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.instagram.com/',
            'Origin': 'https://www.instagram.com',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'TE': 'trailers',
            'Priority': 'u=0, i',
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
                "notes": f"AI Extracted (No Cookies): {ai_notes}"
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "FINAL VERSION - INSTAGRAM + ALLRECIPES + AI FALLBACK - NOV 8 2025"}