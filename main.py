import os
import json
import re
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from recipe_scrapers import scrape_me
import yt_dlp
from openai import OpenAI
from typing import List

app = FastAPI()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ExtractRequest(BaseModel):
    url: str

def parse_with_ai(transcript: str):
    if not transcript.strip():
        return None, None, None
    
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
        return None, None, None
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None, None, None

@app.post("/extract")
async def extract_recipe(request: ExtractRequest):
    url = request.url.strip()
    
    # Try recipe-scrapers (websites)
    try:
        scraper = scrape_me(url, wild_mode=True)
        scraper_data = scraper.to_json()
        return {
            "title": scraper_data.get("title", "Untitled"),
            "ingredients": scraper_data.get("ingredients", []),
            "instructions": scraper_data.get("instructions", "").split("\n") if scraper_data.get("instructions") else [],
            "image": scraper_data.get("image", ""),
            "yield": scraper_data.get("yields", ""),
            "time": scraper_data.get("total_time", 0),
            "notes": ""
        }
    except Exception as e:
        print(f"Scrapers failed: {e}")
    
    # Fallback: yt-dlp for videos
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            title = info.get('title', 'Video Recipe')
            description = info.get('description', '')
            transcript = ""
            
            # Get subtitles
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
            
            if full_text:
                ai_ingredients, ai_instructions, ai_notes = parse_with_ai(full_text)
                if ai_ingredients and ai_instructions:
                    return {
                        "title": title,
                        "ingredients": ai_ingredients,
                        "instructions": ai_instructions,
                        "image": info.get('thumbnail', ''),
                        "yield": "",
                        "time": info.get('duration', 0) or 0,
                        "notes": f"AI Extracted from transcript:\n{full_text[:500]}..."
                    }
            
            return {
                "title": title,
                "ingredients": [],
                "instructions": [],
                "image": info.get('thumbnail', ''),
                "yield": "",
                "time": 0,
                "notes": f"Video description:\n{description}\n\nNo recipe found in transcript."
            }
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Extraction failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "UNIVERSAL EXTRACTOR LIVE + AI VIDEO PARSING ACTIVE"}