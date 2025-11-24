import { useState } from 'react';
import { supabase } from './lib/supabase';
import { reuploadExternalImage } from './lib/imageUtils';

export default function ImageMigrationTool() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });

  const runMigration = async () => {
    setIsRunning(true);
    setProgress('Starting migration...\n');
    
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setProgress('Error: Not authenticated');
        setIsRunning(false);
        return;
      }

      // Get all posts with Instagram URLs
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, image_url, user_id')
        .or('image_url.ilike.%instagram.com%,image_url.ilike.%cdninstagram.com%,image_url.ilike.%fbcdn.net%');

      if (error) throw error;
      if (!posts || posts.length === 0) {
        setProgress('No Instagram images to migrate\n');
        setIsRunning(false);
        return;
      }

      setProgress(`Found ${posts.length} posts with Instagram images\n\n`);
      setStats({ total: posts.length, success: 0, failed: 0 });
      
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        setProgress(prev => prev + `\n[${i + 1}/${posts.length}] Processing post ${post.id}...\n`);
        
        // Handle single or multiple images
        let imageUrls: string[] = [];
        try {
          imageUrls = JSON.parse(post.image_url);
        } catch {
          imageUrls = post.image_url.includes(',')
            ? post.image_url.split(',').map((url: string) => url.trim())
            : [post.image_url];
        }

        const newUrls: string[] = [];
        for (const url of imageUrls) {
          if (url.includes('instagram.com') || url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
            setProgress(prev => prev + `  Reuploading: ${url.substring(0, 60)}...\n`);
            const newUrl = await reuploadExternalImage(url, post.user_id);
            
            if (newUrl) {
              newUrls.push(newUrl);
              setProgress(prev => prev + `  ✓ Success!\n`);
            } else {
              setProgress(prev => prev + `  ✗ Failed, keeping original\n`);
              newUrls.push(url); // Keep original as fallback
            }
          } else {
            newUrls.push(url);
          }
        }

        // Update post with new URLs
        const finalImageUrl = newUrls.length > 1 
          ? JSON.stringify(newUrls)
          : newUrls[0];

        const { error: updateError } = await supabase
          .from('posts')
          .update({ image_url: finalImageUrl })
          .eq('id', post.id);

        if (updateError) {
          setProgress(prev => prev + `  ✗ Failed to update database\n`);
          failCount++;
        } else {
          setProgress(prev => prev + `  ✓ Updated post ${post.id}\n`);
          successCount++;
        }

        setStats({ total: posts.length, success: successCount, failed: failCount });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setProgress(prev => prev + `\n=== Migration Complete ===\n`);
      setProgress(prev => prev + `Success: ${successCount}\n`);
      setProgress(prev => prev + `Failed: ${failCount}\n`);
      setProgress(prev => prev + `Total: ${posts.length}\n`);

    } catch (error) {
      setProgress(prev => prev + `\nMigration failed: ${error}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Instagram Image Migration Tool</h1>
          <p className="text-gray-600 mb-6">
            This will find all posts with expired Instagram URLs and re-upload them to Supabase Storage.
          </p>

          {stats.total > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Total Posts:</span>
                <span>{stats.total}</span>
              </div>
              <div className="flex justify-between mb-2 text-green-600">
                <span className="font-medium">Success:</span>
                <span>{stats.success}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span className="font-medium">Failed:</span>
                <span>{stats.failed}</span>
              </div>
              <div className="mt-4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${((stats.success + stats.failed) / stats.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={runMigration}
            disabled={isRunning}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
              isRunning 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {isRunning ? 'Migration Running...' : 'Start Migration'}
          </button>

          <div className="mt-6 bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{progress || 'Click "Start Migration" to begin...'}</pre>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p className="font-medium mb-2">⚠️ Important Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>This may take several minutes depending on how many posts you have</li>
              <li>Don't close this tab until it's finished</li>
              <li>Original Instagram URLs will be kept as fallback if reupload fails</li>
              <li>Once complete, refresh the Discover page to see the results</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}