# SHAWN RECIPE EXTRACTOR v9008 - SMART HYBRID MODE (YouTube = fast description, IG/TT = full audio)
import os
import re
import json
import requests
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from recipe_scrapers import scrape_me
import yt_dlp
from openai import OpenAI
import ytmusicapi

# Initialize clients
ytm = ytmusicapi.YTMusic()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# CORS — allow everything
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Your working Instagram cookies (keeps private reels working)
INSTAGRAM_COOKIES = """# Netscape HTTP Cookie File
.instagram.com TRUE / FALSE 1733875200 csrftoken abxvXW3Nl1NZES5GKhSebmYt7chBhJcK
.instagram.com TRUE / FALSE 1729999569 datr raTLaBySXpCKW2Tm0ctSbzzO
.instagram.com TRUE / FALSE 1731282769 ds_user_id 46425022
.instagram.com TRUE / FALSE 1728789640 ig_did 8A6D83CE-01C7-4F7B-932A-4E1B53BDD872
.instagram.com TRUE / FALSE 1728789631 ig_nrcb 1
.instagram.com TRUE / FALSE 1730074964 mid aM2o1AAEAAGpGRetOSmne116jpAx
.instagram.com TRUE / FALSE 1765735567 rur NHA\\05446425022\\0541794209167:01fe194320b30b02ad5593ee86a36c94aae2ba277c6de7d9928af768fdc52be1ce304e6d
.instagram.com TRUE / FALSE 0 sessionid 46425022%3AgxJ1gyMKJIYHuM%3A1%3AAYiTBmGJRdKL3lJoh-62dkuF7a9-GkipKKFYEEa89w
.instagram.com TRUE / FALSE 1731261982 wd 400x667
"""

class ExtractRequest(BaseModel):
    url: str

class YTMusicRequest(BaseModel):
    query: str
    limit: int = 5

def transcribe_audio(audio_path: str) -> str:
    try:
        print(f"[TRANSCRIBE] Sending {audio_path} to Whisper...")
        with open(audio_path, 'rb') as f:
            transcript = client.audio.transcriptions.create(model="whisper-1", file=f)
        print(f"[TRANSCRIBE] Success: {len(transcript.text)} chars")
        return transcript.text
    except Exception as e:
        print(f"[TRANSCRIBE] Failed: {e}")
        return ""

def parse_with_ai(text: str):
    if not text.strip():
        return [], [], ""

    prompt = f"""Extract the full recipe from this text and return ONLY valid JSON:

{{
  "ingredients": ["1 cup rice", "2 eggs", ...],
  "instructions": ["Step 1...", "Step 2..."],
  "notes": "any tips"
}}

Text:
{text[:14000]}"""

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1200
        )
        content = resp.choices[0].message.content.strip()
        content = re.sub(r"^```json\s*|\s*```$", "", content, flags=re.MULTILINE)
        data = json.loads(content)
        return (
            data.get("ingredients", []),
            data.get("instructions", []),
            data.get("notes", "")
        )
    except Exception as e:
        print(f"[AI] Parse failed: {e}")
        return [], [], ""

def extract_from_youtube_description(url: str):
    """Fast YouTube extraction using only description (no bot check)"""
    try:
        print("[YOUTUBE] Fast mode: fetching description only...")
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extract_flat': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
        title = info.get('title', 'YouTube Recipe').split(" - YouTube")[0]
        description = info.get('description', '') or ""
        thumbnail = info.get('thumbnail', '')
        channel = info.get('uploader', 'Unknown')

        ings, inst, notes = parse_with_ai(description)
        
        print(f"[YOUTUBE] Success: {len(ings)} ingredients from description")
        return {
            "title": title,
            "channel": channel,
            "thumbnail": thumbnail,
            "ingredients": ings,
            "instructions": inst,
            "notes": f"Fast extract from description • {notes}"
        }
    except Exception as e:
        print(f"[YOUTUBE] Fast mode failed: {e}")
        return None

@app.options("/extract")
async def extract_options():
    return JSONResponse(content={}, status_code=200, headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    })

@app.post("/extract")
async def extract_recipe(request: ExtractRequest):
    url = request.url.strip()
    if not url:
        raise HTTPException(400, "URL required")

    print(f"[EXTRACT] Processing: {url}")

    # 1. Regular recipe websites → recipe-scrapers
    try:
        print("[EXTRACT] Trying recipe-scrapers...")
        scraper = scrape_me(url)
        data = scraper.to_json()
        print(f"[EXTRACT] Success: {data.get('title')}")
        return {
            "title": data.get("title"),
            "ingredients": data.get("ingredients", []),
            "instructions": data.get("instructions", "").split("\n") if data.get("instructions") else [],
            "image": data.get("image", ""),
            "thumbnail": data.get("image", ""),
            "author": data.get("author", "Unknown"),
            "prep_time": 15,
            "cook_time": 30,
            "yield": data.get("yields", "4"),
            "notes": "Via recipe-scrapers"
        }
    except Exception as e:
        print(f"[EXTRACT] recipe-scrapers failed: {e}")

    # 2. YouTube → FAST DESCRIPTION-ONLY MODE (no bot check)
    if "youtube.com" in url or "youtu.be" in url:
        result = extract_from_youtube_description(url)
        if result:
            return result
        else:
            raise HTTPException(400, "Could not extract from YouTube description")

    # 3. TikTok & Instagram → FULL AUDIO TRANSCRIPTION (your cookies work!)
    print("[EXTRACT] TikTok/Instagram → full audio mode")
    ydl_opts = {
        'quiet': True,
        'format': 'bestaudio/best',
        'outtmpl': '/tmp/%(id)s.%(ext)s',
        'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3'}],
        'http_headers': {'User-Agent': 'Instagram 219.0.0.12.117 Android'},
    }

    cookie_file = None
    audio_file = None

    if "instagram.com" in url and INSTAGRAM_COOKIES.strip():
        temp = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
        temp.write(INSTAGRAM_COOKIES)
        temp.close()
        cookie_file = temp.name
        ydl_opts['cookiefile'] = cookie_file

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_id = info.get('id', 'unknown')
            audio_file = f"/tmp/{video_id}.mp3"

            transcript = transcribe_audio(audio_file) if os.path.exists(audio_file) else ""
            description = info.get('description', '') or ""
            text = f"{description}\n\nTranscript: {transcript}" if transcript else description

            ings, inst, notes = parse_with_ai(text)

            return {
                "title": info.get('title', 'Video Recipe'),
                "ingredients": ings or [],
                "instructions": inst or [],
                "thumbnail": info.get('thumbnail', ''),
                "channel": info.get('uploader', 'Unknown'),
                "notes": "Full audio extract" if transcript else "Description only"
            }
    except Exception as e:
        print(f"[EXTRACT] Video failed: {e}")
        raise HTTPException(400, f"Extraction failed: {str(e)}")
    finally:
        for f in (cookie_file, audio_file):
            if f and os.path.exists(f):
                os.unlink(f)

# Keep your YTMusic & health endpoints unchanged
@app.post("/ytmusic-search")
async def ytmusic_search_endpoint(request: YTMusicRequest):
    results = []
    try:
        search = ytm.search(request.query, filter='songs', limit=request.limit)
        results = [{
            'id': s['videoId'],
            'title': s['title'],
            'artist': s['artists'][0]['name'] if s.get('artists') else 'Unknown',
            'thumbnail': s['thumbnails'][0]['url'] if s.get('thumbnails') else None
        } for s in search]
    except: pass
    return {"songs": results}

@app.get("/")
@app.get("/health")
async def root():
    return {"message": "Recipe Extractor v9008 — Smart Hybrid Mode", "status": "healthy"}
