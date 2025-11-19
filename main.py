# SHAWN RECIPE EXTRACTOR v9007 - WITH AUDIO TRANSCRIPTION
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

# Initialize YTMusic and OpenAI
ytm = ytmusicapi.YTMusic()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def search_ytmusic(query: str, limit: int = 5):
    try:
        results = ytm.search(query, filter='songs', limit=limit)
        return [
            {
                'id': track['videoId'],
                'title': track['title'],
                'artist': track['artists'][0]['name'] if track.get('artists') else 'Unknown',
                'duration': track.get('duration'),
                'thumbnail': track['thumbnails'][0]['url'] if track.get('thumbnails') else None
            }
            for track in results
        ]
    except Exception as e:
        print(f"YTMusic error: {e}")
        return []

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

INSTAGRAM_COOKIES = """# Netscape HTTP Cookie File
.instagram.com	TRUE	/	FALSE	1733875200	csrftoken	abxvXW3Nl1NZES5GKhSebmYt7chBhJcK
.instagram.com	TRUE	/	FALSE	1729999569	datr	raTLaBySXpCKW2Tm0ctSbzzO
.instagram.com	TRUE	/	FALSE	1731282769	ds_user_id	46425022
.instagram.com	TRUE	/	FALSE	1728789640	ig_did	8A6D83CE-01C7-4F7B-932A-4E1B53BDD872
.instagram.com	TRUE	/	FALSE	1728789631	ig_nrcb	1
.instagram.com	TRUE	/	FALSE	1730074964	mid	aM2o1AAEAAGpGRetOSmne116jpAx
.instagram.com	TRUE	/	FALSE	1765735567	rur	NHA\\05446425022\\0541794209167:01fe194320b30b02ad5593ee86a36c94aae2ba277c6de7d9928af768fdc52be1ce304e6d
.instagram.com	TRUE	/	FALSE	0	sessionid	46425022%3AgxJ1gyMKJIYHuM%3A1%3AAYiTBmGJRdKL3lJoh-62dkuF7a9-GkipKKFYEEa89w
.instagram.com	TRUE	/	FALSE	1731261982	wd	400x667
"""

class ExtractRequest(BaseModel):
    url: str

class YTMusicRequest(BaseModel):
    query: str
    limit: int = 5

def transcribe_audio(audio_path: str) -> str:
    """Transcribe audio using OpenAI Whisper"""
    try:
        print(f"[TRANSCRIBE] Transcribing audio from {audio_path}")
        with open(audio_path, 'rb') as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en"
            )
        print(f"[TRANSCRIBE] ✓ Transcription complete: {len(transcript.text)} chars")
        return transcript.text
    except Exception as e:
        print(f"[TRANSCRIBE] Error: {e}")
        return ""

def parse_with_ai(text: str):
    """Extract recipe from text using GPT-4"""
    if not text.strip():
        return [], [], ""
    
    prompt = f"""Extract the recipe from this text and return ONLY valid JSON with this exact structure:
{{
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "notes": "any additional notes"
}}

Text: {text[:14000]}"""
    
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a recipe extraction expert. Always return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1000
        )
        
        content = resp.choices[0].message.content.strip()
        # Remove markdown code blocks if present
        content = re.sub(r'^```json\s*|\s*```$', '', content, flags=re.MULTILINE)
        
        data = json.loads(content)
        return (
            data.get("ingredients", []),
            data.get("instructions", []),
            data.get("notes", "")
        )
    except Exception as e:
        print(f"[AI] Parsing error: {e}")
    
    return [], [], ""

@app.options("/extract")
async def extract_options():
    """Handle CORS preflight for /extract"""
    return JSONResponse(
        content={},
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "600",
        }
    )

@app.post("/extract")
async def extract_recipe(request: ExtractRequest):
    """Main recipe extraction endpoint"""
    url = request.url.strip()
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    print(f"[EXTRACT] Processing: {url}")
    
    # Try recipe-scrapers for regular websites
    try:
        print("[EXTRACT] Trying recipe-scrapers...")
        scraper = scrape_me(url)
        data = scraper.to_json()
        
        print(f"[EXTRACT] ✓ Scraped: {data.get('title')}")
        
        return JSONResponse(
            content={
                "title": data.get("title"),
                "ingredients": data.get("ingredients", []),
                "instructions": data.get("instructions", "").split("\n") if data.get("instructions") else [],
                "image": data.get("image", ""),
                "thumbnail": data.get("image", ""),
                "author": data.get("author", "Unknown"),
                "prep_time": data.get("prep_time", 15),
                "cook_time": data.get("cook_time", 30),
                "yield": data.get("yields", "4"),
                "notes": "Extracted via recipe-scrapers"
            },
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        print(f"[EXTRACT] recipe-scrapers failed: {e}")
    
    # Try AI HTML parsing for regular websites
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        print("[EXTRACT] Trying AI HTML parsing...")
        response = requests.get(url, headers=headers, timeout=20)
        html = response.text
        
        ings, inst, notes = parse_with_ai(html)
        
        if ings or inst:
            print(f"[EXTRACT] ✓ AI extracted: {len(ings)} ingredients, {len(inst)} instructions")
            
            return JSONResponse(
                content={
                    "title": "AI Extracted Recipe",
                    "ingredients": ings,
                    "instructions": inst,
                    "thumbnail": "",
                    "notes": f"AI parsed • {notes}"
                },
                headers={"Access-Control-Allow-Origin": "*"}
            )
    except Exception as e:
        print(f"[EXTRACT] AI HTML parsing failed: {e}")
    
    # Try yt-dlp for videos WITH AUDIO TRANSCRIPTION
    print("[EXTRACT] Trying yt-dlp for video with audio transcription...")
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'geo_bypass': True,
        'format': 'bestaudio/best',
        'extractor_args': {
            'instagram': {
                'api_key': '936619743392459'
            }
        },
        'http_headers': {
            'User-Agent': 'Instagram 219.0.0.12.117 Android',
            'x-ig-app-id': '936619743392459'
        },
        'outtmpl': '/tmp/%(id)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }
    
    cookie_file = None
    audio_file = None
    
    if INSTAGRAM_COOKIES.strip():
        temp = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
        temp.write(INSTAGRAM_COOKIES)
        temp.close()
        cookie_file = temp.name
        ydl_opts['cookiefile'] = cookie_file
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
            # Try to find the downloaded audio file
            video_id = info.get('id', 'unknown')
            audio_file = f"/tmp/{video_id}.mp3"
            
            transcript = ""
            
            # Transcribe audio if file exists
            if os.path.exists(audio_file):
                transcript = transcribe_audio(audio_file)
            
            # Combine description and transcript
            description = info.get('description', '')
            combined_text = f"{description}\n\nTranscript: {transcript}" if transcript else description
            
            # Extract recipe from combined text
            ings, inst, notes = parse_with_ai(combined_text)
            
            print(f"[EXTRACT] ✓ Video extracted: {info.get('title')}")
            print(f"[EXTRACT] Found {len(ings)} ingredients, {len(inst)} instructions")
            
            return JSONResponse(
                content={
                    "title": info.get('title', 'Video Recipe'),
                    "ingredients": ings or [],
                    "instructions": inst or [],
                    "thumbnail": info.get('thumbnail', ''),
                    "author": info.get('uploader', 'Unknown'),
                    "notes": f"Video + audio extraction • {notes}" if transcript else f"Video extraction • {notes}"
                },
                headers={"Access-Control-Allow-Origin": "*"}
            )
    
    except Exception as e:
        print(f"[EXTRACT] yt-dlp failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Could not extract recipe: {str(e)}"
        )
    
    finally:
        if cookie_file and os.path.exists(cookie_file):
            os.unlink(cookie_file)
        if audio_file and os.path.exists(audio_file):
            os.unlink(audio_file)

@app.options("/ytmusic-search")
async def ytmusic_options():
    """Handle CORS preflight for /ytmusic-search"""
    return JSONResponse(
        content={},
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "600",
        }
    )

@app.post("/ytmusic-search")
async def ytmusic_search_endpoint(request: YTMusicRequest):
    """YouTube Music search endpoint"""
    results = search_ytmusic(request.query, request.limit)
    
    return JSONResponse(
        content={"songs": results},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.get("/")
async def root():
    """Health check endpoint"""
    return JSONResponse(
        content={
            "message": "Recipe Extraction Server v9007 - With Audio Transcription",
            "status": "healthy",
            "endpoints": ["/extract", "/ytmusic-search"]
        },
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.get("/health")
async def health():
    """Health check for monitoring"""
    return JSONResponse(
        content={"status": "ok"},
        headers={"Access-Control-Allow-Origin": "*"}
    )