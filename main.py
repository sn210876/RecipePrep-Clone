from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceback
import time
from recipe_scrapers import scrape_me
import yt_dlp
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

def download_video_info(url: str) -> Dict[str, Any]:
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': False,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'skip_download': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        transcript = ""
        if 'automatic_captions' in info and info['automatic_captions']:
            for lang in ['en', 'en-US', 'en-UK']:
                if lang in info['automatic_captions']:
                    subs = info['automatic_captions'][lang]
                    if subs and 'url' in subs[0]:
                        import requests
                        sub_data = requests.get(subs[0]['url']).text
                        transcript += sub_data[:4000]
                    break
        elif 'subtitles' in info and info['subtitles']:
            for lang in info['subtitles']:
                subs = info['subtitles'][lang]
                if subs:
                    import requests
                    sub_data = requests.get(subs[0]['url']).text
                    transcript += sub_data[:4000]
                    break

        description = info.get('description', '')[:2000]
        transcript = (transcript + "\n\n" + description)[:5000]

        return {
            "imageUrl": info.get('thumbnail'),
            "recipe": {},
            "transcript": transcript
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail={
            "error": f"Video processing failed: {str(e)}",
            "imageUrl": None,
            "recipe": {},
            "transcript": ""
        })

@app.post("/extract")
async def extract_recipe(input: URLInput):
    url = input.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="No URL provided")

    # BLOCKED VIDEO PLATFORMS - Instant rejection
    lowercase_url = url.lower()
    if 'youtube.com' in lowercase_url or 'youtu.be' in lowercase_url:
        raise HTTPException(status_code=400, detail={
            "error": "YouTube blocked the extraction (bot detection). Please watch the video and use manual entry.",
            "imageUrl": None,
            "recipe": {},
            "transcript": ""
        })
    if 'instagram.com' in lowercase_url or 'tiktok.com' in lowercase_url:
        raise HTTPException(status_code=400, detail={
            "error": "This URL requires login or is blocked. Instagram and TikTok do not support automated extraction.",
            "imageUrl": None,
            "recipe": {},
            "transcript": ""
        })

    # VIDEO HANDLING (only for non-blocked like Facebook)
    if is_video_url(url):
        return download_video_info(url)

    # WEB PAGE RECIPE EXTRACTION - recipe-scrapers magic
    time.sleep(1)  # Be gentle on servers
    try:
        scraper = scrape_me(url, wild_mode=True)  # wild_mode handles JS-heavy sites

        recipe_data = {
            "title": scraper.title() or "Untitled Recipe",
            "ingredients": scraper.ingredients(),
            "instructions": scraper.instructions().split('\n') if scraper.instructions() else [],
            "total_time": scraper.total_time(),
            "cook_time": scraper.cook_time(),
            "prep_time": scraper.prep_time(),
            "servings": scraper.yields() or "Unknown",
            "image": scraper.image(),
            "nutrients": scraper.nutrients() or {},
            "author": scraper.author() or "Unknown"
        }

        return {
            "imageUrl": scraper.image(),
            "recipe": recipe_data,
            "transcript": ""
        }

    except Exception as e:
        tb = traceback.format_exc()
        print(f"recipe-scrapers failed for {url}: {tb}")
        raise HTTPException(status_code=400, detail={
            "error": "Failed to extract recipe from this site. Try AllRecipes, Food Network, or BBC Good Food. For videos, use manual entry.",
            "imageUrl": None,
            "recipe": {},
            "transcript": ""
        })

@app.get("/")
async def root():
    return {"message": "Recipe API with recipe-scrapers - Fixed!"}
