# Quick Start Guide

## 1. Install Dependencies
```bash
npm install
```

## 2. Setup Environment
```bash
cp .env.example .env
```

Edit `.env` and add:
```
OPENAI_API_KEY=your_api_key_here
```

## 3. Install yt-dlp

**macOS:**
```bash
brew install yt-dlp
```

**Ubuntu/Debian:**
```bash
sudo apt-get install yt-dlp
```

**Windows:**
```bash
choco install yt-dlp
```

## 4. Verify Installation

Check yt-dlp is installed:
```bash
which yt-dlp    # macOS/Linux
where yt-dlp    # Windows
```

Check syntax:
```bash
node --check server.js
```

## 5. Run the Server

**Development (auto-restart on changes):**
```bash
npm run server:dev
```

**Production:**
```bash
npm run server
```

Server runs on: `http://localhost:3000`

## 6. Test It Works

Health check:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{ "status": "ok" }
```

## 7. Extract a Recipe

```bash
curl -X POST http://localhost:3000/api/extract-recipe-from-video \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"}'
```

## 8. Integrate with Frontend

See `INTEGRATION_GUIDE.md` for frontend integration examples.

## Troubleshooting

### yt-dlp not found
Make sure it's installed and in your PATH

### OpenAI error
Verify API key in .env file

### Port already in use
Kill the process on port 3000 or change PORT in .env

### Syntax errors
Run: `node --check server.js`

## Documentation

- `SERVER_README.md` - Overview and features
- `SERVER_SETUP.md` - Detailed setup and deployment
- `INTEGRATION_GUIDE.md` - Frontend integration
