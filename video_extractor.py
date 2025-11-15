#!/usr/bin/env python3
"""
Video metadata extractor using yt-dlp
Extracts caption/description from social media videos
"""

import sys
import json
import yt_dlp

def extract_video_metadata(url):
    """Extract metadata from video URL"""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            return {
                'title': info.get('title', ''),
                'description': info.get('description', ''),
                'thumbnail': info.get('thumbnail', ''),
                'uploader': info.get('uploader', ''),
                'duration': info.get('duration', 0),
            }
    except Exception as e:
        return {
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No URL provided'}))
        sys.exit(1)

    url = sys.argv[1]
    result = extract_video_metadata(url)
    print(json.dumps(result))
