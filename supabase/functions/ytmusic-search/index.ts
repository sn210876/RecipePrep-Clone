import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface YTMusicSearchResult {
  videoId: string;
  title: string;
  artists?: Array<{ name: string }>;
  duration?: string;
  thumbnails?: Array<{ url: string }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { query, limit = 10 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query parameter is required", songs: [] }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Call YouTube Music search API directly
    const searchUrl = new URL("https://music.youtube.com/youtubei/v1/search");
    searchUrl.searchParams.set("key", "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30");

    const body = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20231122.01.00",
        },
      },
      query: query,
      params: "EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D", // Filter for songs
    };

    const response = await fetch(searchUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://music.youtube.com",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`YouTube Music API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Parse YouTube Music response
    const songs: any[] = [];
    const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    
    for (const section of contents) {
      const items = section?.musicShelfRenderer?.contents || [];
      
      for (const item of items) {
        if (songs.length >= limit) break;
        
        const renderer = item?.musicResponsiveListItemRenderer;
        if (!renderer) continue;
        
        try {
          const videoId = renderer.playlistItemData?.videoId || renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
          if (!videoId) continue;
          
          const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "Unknown";
          const artist = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "Unknown";
          const thumbnail = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url || "";
          const duration = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[4]?.text || "";
          
          songs.push({
            id: videoId,
            title: title,
            artist: artist,
            thumbnail: thumbnail,
            duration: duration,
          });
        } catch (e) {
          console.error("Error parsing item:", e);
          continue;
        }
      }
      
      if (songs.length >= limit) break;
    }

    return new Response(JSON.stringify({ songs }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("YTMusic search error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to search music",
        songs: [],
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});