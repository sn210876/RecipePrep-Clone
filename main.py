import os
import re
import json
import requests
import subprocess
import sys
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from recipe_scrapers import scrape_me
import yt_dlp
from openai import OpenAI

subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "--no-cache-dir", "yt-dlp"])

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

@app.options("/extract")
async def options():
    return JSONResponse(content={}, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Allow-Headers": "*"})

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

INSTAGRAM_COOKIES = """
# Netscape HTTP Cookie File
.instagram.com	TRUE	/	FALSE	1733875200	csrftoken	abxvXW3Nl1NZES5GKhSebmYt7chBhJcK
.instagram.com	TRUE	/	FALSE	1729999569	datr	raTLaBySXpCKW2Tm0ctSbzzO
.instagram.com	TRUE	/	FALSE	1731282769	ds_user_id	46425022
.instagram.com	TRUE	/	FALSE	1728789640	ig_did	8A6D83CE-01C7-4F7B-932A-4E1B53BDD872
.instagram.com	TRUE	/	FALSE	1728789631	ig_nrcb	1
.instagram.com	TRUE	/	FALSE	1730074964	mid	aM2o1AAEAAGpGRetOSmne116jpAx
.instagram.com	TRUE	/	FALSE	1765735567	rur	NHA\\05446425022\\0541794209167:01fe194320b30b02ad5593ee86a36c94aae2ba277c6de7d9928af768fdc52be1ce304e6d
.instagram.com	TRUE	/	Session	0	sessionid	46425022%3AgxJ1gyMKJIYHuM%3A1%3AAYiTBmGJRdKL3lJoh-62dkuF7a9-GkipKKFYEEa89w
.instagram.com	TRUE	/	FALSE	1731261982	wd	400x667
"""

class ExtractRequest(BaseModel):
    url: str

def parse_with_ai(text: str):
    if not text.strip(): return [], [], ""
    prompt = f"Extract ONLY JSON {{ingredients: [], instructions: [], notes: \"\"}} from: {text[:14000]}"
    try:
        resp = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "system", "content": prompt}], temperature=0.1)
        m = re.search(r'\{.*\}', resp.choices[0].message.content, re.DOTALL)
        if m: data = json.loads(m.group()); return data.get("ingredients", []), data.get("instructions", []), data.get("notes", "")
    except: pass
    return [], [], ""

@app.post("/extract")
async def extract(request: ExtractRequest):
    url = request.url.strip()
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

    try:
        scraper = scrape_me(url, headers=headers)
        data = scraper.to_json()
        return {"title": data.get("title"), "ingredients": data.get("ingredients", []), "instructions": data.get("instructions", "").split("\n"), "image": data.get("image", ""), "notes": "Scraped"}
    except Exception as e:
        print(e)

    try:
        html = requests.get(url, headers=headers, timeout=20).text
        ings, inst, notes = parse_with_ai(html)
        if ings or inst: return {"title": "AI", "ingredients": ings, "instructions": inst, "notes": notes}
    except: pass

    ydl_opts = {'quiet': True, 'no_warnings': True, 'geo_bypass': True, 'http_headers': {'User-Agent': 'Instagram 219.0.0.12.117 Android', 'x-ig-app-id': '936619743392459'}}
    cookie_file = None
    if INSTAGRAM_COOKIES.strip():
        temp = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
        temp.write(INSTAGRAM_COOKIES); temp.close()
        cookie_file = temp.name
        ydl_opts['cookiefile'] = cookie_file

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            text = f"{info.get('description', '')}\n{info.get('title', '')}"
            ings, inst, notes = parse_with_ai(text)
            return {"title": info.get('title', 'Reel'), "ingredients": ings, "instructions": inst, "image": info.get('thumbnail', ''), "notes": f"MAC COOKIES WIN NOV 9 • {notes}"}
    except Exception as e:
        raise HTTPException(400, str(e))
    finally:
        if cookie_file and os.path.exists(cookie_file): os.unlink(cookie_file)

@app.get("/")
async def root():
    return {"message": "SHAWN GOD MODE NOV 9 2025 - CACHE BUSTER 999999 - MAC COOKIES + CORS FIXED - CHATGPT DEFEATED"}