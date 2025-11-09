import os
import json
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from recipe_scrapers import scrape_me, NoSchemaFound
import yt_dlp
from openai import OpenAI
from typing import Optional, List

app = FastAPI()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ExtractRequest(BaseModel):
    url: str

def parse_with_ai(transcript: str):
    """Use GPT-4o-mini to parse transcript into recipe structure"""
    if not transcript.strip():
        return None, None, None
    
    prompt = f"""
    Extract a complete recipe from this video transcript. Return ONLY valid JSON with this exact structure:
    {{
        "ingredients": ["1 cup flour", "2 eggs", "1 tsp salt"],
        "instructions": ["Preheat oven to 350°F", "Mix ingredients", "Bake 30 minutes"],
        "notes": "Any additional tips or context"
    }}
    
    Transcript:
    {transcript}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.3,
            max_tokens=1000
        )
        content = response.choices[0].message.content
        # Extract JSON from response
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
        print(f"OpenAI parsing error: {e}")
        return None, None, None

@app.post("/extract")
async def extract_recipe(request: ExtractRequest):
    url = request.url.strip()
    
    # Try recipe-scrapers first (for websites)
    try:
        scraper = scrape_me(url, wild_mode=True)
        return {
            "title": scraper.title() or "Untitled Recipe",
            "ingredients": scraper.ingredients(),
            "instructions": scraper.instructions().split('\n') if scraper.instructions() else [],
            "image": scraper.image(),
            "yield": scraper.yields() or "",
            "time": scraper.total_time() or 0,
            "notes": ""
        }
    except Exception as e:
        print(f"Scrapers failed: {e}")
    
    # Fall back to yt-dlp for videos
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
            
            # Try to get auto subtitles
            if info.get('automatic_captions'):
                for lang in ['en', 'en-US', 'en-UK']:
                    if lang in info['automatic_captions']:
                        subs = info['automatic_captions'][lang]
                        if subs:
                            transcript_url = subs[0]['url']
                            import requests
                            sub_data = requests.get(transcript_url).text
                            # Simple SRT to text
                            lines = [line.strip() for line in sub_data.split('\n') if not line.strip().isdigit() and '-->' not in line]
                            transcript = ' '.join(lines)
                            break
            
            # Combine description + transcript
            full_text = f"{description}\n\n{transcript}".strip()
            
            # Use AI to parse if we have text
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
                        "notes": f"Extracted from video transcript:\n{full_text[:500]}{'...' if len(full_text) > 500 else ''}"
                    }
            
            # Fallback: return what we have
            return {
                "title": title,
                "ingredients": [],
                "instructions": [],
                "image": info.get('thumbnail', ''),
                "yield": "",
                "time": info.get('duration', 0) or 0,
                "notes": f"Video description:\n{description}\n\nNo structured recipe found. AI parsing available with OpenAI key."
            }
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Extraction failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "UNIVERSAL EXTRACTOR LIVE + AI VIDEO PARSING ACTIVE"}