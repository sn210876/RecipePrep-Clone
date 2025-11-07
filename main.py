from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceback
import time
import random
import requests
import logging
from recipe_scrapers import scrape_me
import yt_dlp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS Configuration - Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

class URLInput(BaseModel):
    url: str

def is_video_url(url: str) -> bool:
    return any(domain in url.lower() for domain in ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com', 'fb.watch', 'facebook.com'])

@app.post("/extract")
async def extract_recipe(input: URLInput):
    url = input.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="No URL provided")

    logger.info(f"UNIVERSAL EXTRACTOR: Processing {url}")

    # VIDEO PLATFORMS — TikTok/IG/YouTube (background download via yt-dlp)
    if is_video_url(url):
        time.sleep(random.uniform(1.8, 4.2))  # Ultimate anti-bot
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB'],
            'cookiefile': 'cookies.txt',
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'referrer': 'https://www.google.com/',
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            transcript = ""
            for lang in ['en', 'en-US', 'en-GB']:
                if 'automatic_captions' in info and lang in info['automatic_captions']:
                    caps = info['automatic_captions'][lang]
                    if caps:
                        sub_data = requests.get(caps[0]['url'], headers={'User-Agent': ydl_opts['user_agent']}).text
                        transcript += sub_data[:8000]
                        break
            if not transcript and 'subtitles' in info:
                for lang in info['subtitles']:
                    subs = info['subtitles'][lang]
                    if subs:
                        sub_data = requests.get(subs[0]['url'], headers={'User-Agent': ydl_opts['user_agent']}).text
                        transcript += sub_data[:8000]
                        break

            description = info.get('description', '')[:4000]
            full_transcript = (transcript + "\n\nDescription:\n" + description)[:10000]

            logger.info(f"VIDEO SUCCESS: {info.get('title')} — {len(full_transcript)} chars transcript")
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
                "transcript": full_transcript
            }
        except Exception as e:
            logger.error(f"Video failed: {str(e)}")
            return {
                "imageUrl": None,
                "recipe": {"title": "Video Blocked", "ingredients": [], "instructions": [], "source": "video"},
                "transcript": f"Could not access video (possibly private or rate-limited). Error: {str(e)}"
            }

    # RECIPE WEBSITES & BLOGS — AllRecipes + 541+ others + any schema.org blog
    time.sleep(1.5)
    try:
        logger.info("Attempting recipe-scrapers (wild_mode=True for blogs)")
        # Try with wild_mode first (newer versions), fallback without it
        try:
            scraper = scrape_me(url, wild_mode=True)
        except TypeError:
            # Older version doesn't support wild_mode
            logger.info("wild_mode not supported, trying without it")
            scraper = scrape_me(url)

        ingredients = scraper.ingredients()
        instructions = scraper.instructions()
        if isinstance(instructions, str):
            instructions = [s.strip() for s in instructions.split('\n') if s.strip()]

        logger.info(f"RECIPE SUCCESS: {scraper.title()} — {len(ingredients)} ingredients, {len(instructions)} steps")
        return {
            "imageUrl": scraper.image(),
            "recipe": {
                "title": scraper.title() or "Untitled Recipe",
                "ingredients": ingredients,
                "instructions": instructions,
                "total_time": scraper.total_time(),
                "cook_time": scraper.cook_time(),
                "prep_time": scraper.prep_time(),
                "servings": scraper.yields() or "Unknown",
                "source": "website"
            },
            "transcript": ""
        }
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"recipe-scrapers failed: {tb}")
        return {
            "imageUrl": None,
            "recipe": {"title": "Unsupported Site", "ingredients": [], "instructions": []},
            "transcript": f"Could not parse recipe. This site may not have structured data. Error: {str(e)}"
        }

@app.get("/")
async def root():
    return {"message": "UNIVERSAL EXTRACTOR LIVE — TikTok/IG/AllRecipes/Blogs = ALL WORKING IN BACKGROUND"}