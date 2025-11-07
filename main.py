from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceback
import time
import random
from recipe_scrapers import scrape_me
import yt_dlp
import requests
from typing import Dict, Any

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLInput(BaseModel):
    url: str

def is_video_url(url: str) -> bool:
    video_domains = ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com', 'facebook.com', 'fb.watch']
    return any(domain in url.lower() for domain in video_domains)


@app.post("/extract")
async def extract_recipe(input: URLInput):
    url = input.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="No URL provided")

    lowercase_url = url.lower()

    # VIDEO HANDLING FIRST - Now works for YouTube/IG/TT
    if is_video_url(url):
        time.sleep(random.uniform(1, 3))  # Anti-bot delay

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-UK'],
            'cookiefile': 'cookies.txt',
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'referer': 'https://www.google.com/',
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            transcript = ""
            # Auto captions first
            if 'automatic_captions' in info:
                for lang in ['en', 'en-US', 'en-UK']:
                    if lang in info['automatic_captions']:
                        caps = info['automatic_captions'][lang]
                        if caps and 'url' in caps[0]:
                            sub_data = requests.get(caps[0]['url'], headers={'User-Agent': ydl_opts['user_agent']}).text
                            transcript += sub_data[:6000]
                            break

            # Fallback to manual subtitles
            if not transcript and 'subtitles' in info:
                for lang in info['subtitles']:
                    subs = info['subtitles'][lang]
                    if subs:
                        sub_data = requests.get(subs[0]['url'], headers={'User-Agent': ydl_opts['user_agent']}).text
                        transcript += sub_data[:6000]
                        break

            description = info.get('description', '')[:3000]
            full_text = (transcript + "\n\nDescription:\n" + description)[:8000]

            return {
                "imageUrl": info.get('thumbnail'),
                "recipe": {
                    "title": info.get('title', 'Video Recipe'),
                    "ingredients": [],
                    "instructions": [],
                    "total_time": info.get('duration', 0) // 60 if info.get('duration') else None,
                    "servings": "Unknown",
                    "source": "video"
                },
                "transcript": full_text
            }
        except Exception as e:
            error_msg = "Video blocked or private. Try watching and using manual entry below."
            if "unusual traffic" in str(e).lower():
                error_msg = "YouTube detected automation. Wait 5 mins or try manual entry."
            raise HTTPException(status_code=400, detail={
                "error": error_msg,
                "imageUrl": None,
                "recipe": {},
                "transcript": ""
            })

    # WEB RECIPES - Keep recipe-scrapers perfection
    time.sleep(1)
    try:
        scraper = scrape_me(url, wild_mode=True)
        recipe_data = {
            "title": scraper.title() or "Untitled Recipe",
            "ingredients": scraper.ingredients(),
            "instructions": scraper.instructions().split('\n') if scraper.instructions() else [],
            "total_time": scraper.total_time(),
            "cook_time": scraper.cook_time(),
            "prep_time": scraper.prep_time(),
            "servings": scraper.yields() or "Unknown",
            "image": scraper.image(),
            "source": "website"
        }
        return {
            "imageUrl": scraper.image(),
            "recipe": recipe_data,
            "transcript": ""
        }
    except Exception as e:
        tb = traceback.format_exc()
        print(f"Scraping failed: {tb}")
        raise HTTPException(status_code=400, detail={
            "error": "Site not supported. Try AllRecipes or manual entry.",
            "imageUrl": None,
            "recipe": {},
            "transcript": ""
        })

@app.get("/")
async def root():
    return {"message": "Recipe API with recipe-scrapers - Fixed!"}
