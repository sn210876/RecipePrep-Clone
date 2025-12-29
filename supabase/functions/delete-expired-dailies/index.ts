import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Find all dailies older than 24 hours
    const { data: expiredDailies, error: queryError } = await supabase
      .from("dailies")
      .select("id, image_url, video_url, user_id")
      .lt("created_at", twentyFourHoursAgo.toISOString());

    if (queryError) {
      console.error("Error querying expired dailies:", queryError);
      throw queryError;
    }

    if (!expiredDailies || expiredDailies.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No expired dailies found",
          processed: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Found ${expiredDailies.length} expired dailies to delete`);

    // Delete storage files and track results
    const deletionResults = {
      storageDeleted: 0,
      storageFailed: 0,
      recordsDeleted: 0,
    };

    for (const daily of expiredDailies) {
      // Delete image from storage if it exists
      if (daily.image_url) {
        try {
          // Extract the file path from the URL
          // URL format: https://.../storage/v1/object/public/dailies/path/to/file
          const urlParts = daily.image_url.split("/dailies/");
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            const { error: imageDeleteError } = await supabase.storage
              .from("dailies")
              .remove([filePath]);

            if (imageDeleteError) {
              console.error(
                `Failed to delete image for daily ${daily.id}:`,
                imageDeleteError
              );
              deletionResults.storageFailed++;
            } else {
              deletionResults.storageDeleted++;
            }
          }
        } catch (error) {
          console.error(`Error parsing image URL for daily ${daily.id}:`, error);
          deletionResults.storageFailed++;
        }
      }

      // Delete video from storage if it exists
      if (daily.video_url) {
        try {
          // Extract the file path from the URL
          const urlParts = daily.video_url.split("/dailies/");
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            const { error: videoDeleteError } = await supabase.storage
              .from("dailies")
              .remove([filePath]);

            if (videoDeleteError) {
              console.error(
                `Failed to delete video for daily ${daily.id}:`,
                videoDeleteError
              );
              deletionResults.storageFailed++;
            } else {
              deletionResults.storageDeleted++;
            }
          }
        } catch (error) {
          console.error(`Error parsing video URL for daily ${daily.id}:`, error);
          deletionResults.storageFailed++;
        }
      }
    }

    // Delete the database records
    const { error: deleteError } = await supabase
      .from("dailies")
      .delete()
      .in(
        "id",
        expiredDailies.map((d) => d.id)
      );

    if (deleteError) {
      console.error("Error deleting expired dailies from database:", deleteError);
      throw deleteError;
    }

    deletionResults.recordsDeleted = expiredDailies.length;

    console.log(`Successfully deleted ${deletionResults.recordsDeleted} dailies`);
    console.log(
      `Storage files: ${deletionResults.storageDeleted} deleted, ${deletionResults.storageFailed} failed`
    );

    return new Response(
      JSON.stringify({
        message: "Expired dailies deletion completed",
        ...deletionResults,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in delete-expired-dailies:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
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
