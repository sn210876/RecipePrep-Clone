import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, PlayCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { migrateExistingRecipes, migrateExistingPosts } from '@/lib/imageStorage';

export default function AdminImageMigration() {
  const { isAdmin } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [recipeStatus, setRecipeStatus] = useState<string>('');
  const [postStatus, setPostStatus] = useState<string>('');
  const [recipeResults, setRecipeResults] = useState<any>(null);
  const [postResults, setPostResults] = useState<any>(null);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const handleMigrateRecipes = async () => {
    setMigrating(true);
    setRecipeStatus('Starting recipe migration...');
    setRecipeResults(null);

    try {
      await migrateExistingRecipes();
      setRecipeStatus('Recipe migration complete!');
      setRecipeResults({ success: true });
    } catch (error) {
      console.error('Migration failed:', error);
      setRecipeStatus('Recipe migration failed: ' + (error as Error).message);
      setRecipeResults({ success: false, error: (error as Error).message });
    } finally {
      setMigrating(false);
    }
  };

  const handleMigratePosts = async () => {
    setMigrating(true);
    setPostStatus('Starting post migration...');
    setPostResults(null);

    try {
      const results = await migrateExistingPosts();
      setPostStatus('Post migration complete!');
      setPostResults(results);
    } catch (error) {
      console.error('Post migration failed:', error);
      setPostStatus('Post migration failed: ' + (error as Error).message);
      setPostResults({ success: false, error: (error as Error).message });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Image Migration Tool
        </h1>
        <p className="text-muted-foreground mt-1">
          Migrate expired Instagram URLs to permanent Supabase storage
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Recipe Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will find all recipes with Instagram URLs and download them to permanent Supabase storage.
              This fixes the issue where recipe images disappear when Instagram CDN URLs expire.
            </p>

            <Button
              onClick={handleMigrateRecipes}
              disabled={migrating}
              className="w-full"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {migrating ? 'Migrating...' : 'Migrate Recipe Images'}
            </Button>

            {recipeStatus && (
              <div className={`p-4 rounded-lg border ${
                recipeResults?.success === false
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className="text-sm font-medium">{recipeStatus}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Post Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will find all social posts with Instagram URLs and download them to permanent Supabase storage.
              Posts with expired URLs will be identified for re-upload.
            </p>

            <Button
              onClick={handleMigratePosts}
              disabled={migrating}
              className="w-full"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {migrating ? 'Migrating...' : 'Migrate Post Images'}
            </Button>

            {postStatus && (
              <div className={`p-4 rounded-lg border ${
                postResults?.success === false
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className="text-sm font-medium mb-2">{postStatus}</p>
                {postResults && (
                  <div className="space-y-1 text-sm">
                    {postResults.successCount !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Migrated: {postResults.successCount}</span>
                      </div>
                    )}
                    {postResults.expiredCount !== undefined && postResults.expiredCount > 0 && (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Expired (cannot recover): {postResults.expiredCount}</span>
                      </div>
                    )}
                    {postResults.total !== undefined && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <span>Total checked: {postResults.total}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {postResults?.expiredPosts?.length > 0 && (
              <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                <p className="text-sm font-medium mb-2">Posts that need to be re-uploaded:</p>
                <ul className="text-sm space-y-1">
                  {postResults.expiredPosts.map((post: any) => (
                    <li key={post.id} className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>"{post.title}" (ID: {post.id})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-2">
                <p className="font-medium text-blue-900">How this works:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Finds all images hosted on Instagram CDN</li>
                  <li>Downloads each image through the proxy</li>
                  <li>Uploads to permanent Supabase storage</li>
                  <li>Updates database records with new URLs</li>
                  <li>Images with expired tokens cannot be recovered</li>
                </ul>
                <p className="text-blue-900 mt-2">
                  Run this periodically to ensure all images are permanently stored.
                  Check the browser console for detailed progress logs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-2">
                <p className="font-medium text-green-900">Automatic Migration Active</p>
                <p className="text-green-800">
                  The app automatically detects and migrates external images in the background:
                </p>
                <ul className="list-disc list-inside space-y-1 text-green-800">
                  <li>New recipes with external URLs are migrated immediately</li>
                  <li>Existing recipes are checked and migrated in batches</li>
                  <li>Migration runs every minute in the background</li>
                  <li>Maximum 10 recipes per batch to avoid rate limits</li>
                </ul>
                <p className="text-green-800 mt-2">
                  You can still use this page for manual bulk migration if needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
