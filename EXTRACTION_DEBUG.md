# Instagram Recipe Extraction Debugging Guide

## Current Issue
Instagram videos are not extracting ingredients and instructions from the video transcript correctly.

## What Should Happen
1. Server downloads the video audio
2. Transcribes audio using OpenAI Whisper
3. Gets video metadata (description)
4. Uses GPT-4 to extract recipe from transcript + description
5. Returns structured recipe data

## Testing the Extraction

### Step 1: Start the Server
```bash
npm run server
```

The server should start on port 3000.

### Step 2: Run the Test Script
```bash
node test-extraction.js
```

This will:
- Send the Instagram URL to the extraction endpoint
- Show you the transcript that was extracted
- Show you the description
- Show you the final recipe output

### Step 3: Analyze the Output

Look for:
1. **Transcript Quality**: Is the transcript accurate? Does it contain the ingredients and instructions?
2. **Description**: Does the Instagram description have recipe info?
3. **Final Recipe**: Are the ingredients and instructions from the transcript or made up?

## Common Issues

### Issue: Transcript is empty or garbled
**Solution**: yt-dlp might not be able to access the video. Try:
- Check if yt-dlp is installed: `yt-dlp --version`
- Try downloading manually: `yt-dlp -f bestaudio [URL]`
- Instagram might be blocking automated access - try with cookies

### Issue: Recipe doesn't match transcript
**Solution**: The AI prompt has been updated to prioritize the transcript. Check:
- Is the transcript actually being passed to GPT-4?
- Look at the console logs in the server to see what's being sent

### Issue: Server errors
**Solution**: Check for:
- Missing OPENAI_API_KEY in .env file
- yt-dlp not installed
- Network/firewall issues

## Expected Instagram Video Format

Instagram cooking videos typically have:
- **Audio**: The creator verbally lists ingredients and steps
- **Description**: May contain written recipe or just caption
- **Video**: Visual demonstration

The transcript should capture the spoken words, which is the primary source.

## Manual Testing

You can also test the OpenAI extraction directly:

```bash
# Get transcript
yt-dlp -f bestaudio -x --audio-format mp3 [URL] -o test_audio.mp3
# (Then use OpenAI Whisper API to transcribe)

# Get description
yt-dlp --skip-download --write-info-json [URL] -o test_info
cat test_info.info.json | grep description
```

## Server Logs to Watch

When you run the extraction, watch for these log messages:
- "Downloading audio..."
- "Transcription result:"
- "Video metadata:"
- "GPT-4 prompt:" (to see what's being sent to AI)
- "GPT-4 response:" (to see what AI returned)

Add more console.log statements in server.js if needed to debug.
