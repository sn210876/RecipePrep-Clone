import { useState, useEffect } from 'react';
import { Clock, ChefHat, Bookmark, Flame, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter } from './ui/card';
import { Recipe } from '../types/recipe';
import { RecipeDetailModal } from './RecipeDetailModal';
import { useRecipes } from '../context/RecipeContext';
import RatingDisplay from './RatingDisplay';
import { getRecipeReviews, getAverageRating } from '../services/reviewService';
import { ReviewForm } from './ReviewForm';
import { supabase } from '../lib/supabase';
import { decodeHtmlEntities } from '@/lib/utils';

interface RecipeCardProps {
  recipe: Recipe;
  onSave?: (recipeId: string) => void;
  onCook?: (recipeId: string) => void;
  onDelete?: (recipeId: string) => void;
  showReviewButton?: boolean;
  isAdmin?: boolean;
}

export function RecipeCard({ recipe, onSave, onCook, onDelete, showReviewButton = false, isAdmin = false }: RecipeCardProps) {
  const { state } = useRecipes();
  const [showDetail, setShowDetail] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [socialPost, setSocialPost] = useState<any>(null);
  const totalTime = recipe.prepTime + recipe.cookTime;
  const isSaved = state.savedRecipes.some(r => r.id === recipe.id);

  const difficultyColors = {
    Easy: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-amber-100 text-amber-700 border-amber-200',
    Hard: 'bg-red-100 text-red-700 border-red-200',
  };

  const loadReviewData = async () => {
    try {
      const reviews = await getRecipeReviews(recipe.id);
      setReviewCount(reviews.length);
      const avgRating = await getAverageRating(recipe.id);
      setAverageRating(avgRating);
    } catch (error) {
      console.error('Failed to load review data:', error);
    }
  };

  const loadSocialPost = async () => {
    try {
      let postData = null;

      // First try to find by recipe_id
      const { data: postByRecipeId, error: recipeIdError } = await supabase
        .from('posts')
        .select('*')
        .eq('recipe_id', recipe.id)
        .maybeSingle();

      console.log('[RecipeCard] Search by recipe_id:', recipe.id, 'Found:', postByRecipeId ? 'YES' : 'NO', 'Error:', recipeIdError);

      if (postByRecipeId) {
        postData = postByRecipeId;
      } else {
        // Fallback: try to find by video_url
        const { data: recipeData } = await supabase
          .from('public_recipes')
          .select('video_url')
          .eq('id', recipe.id)
          .maybeSingle();

        console.log('[RecipeCard] Search by video_url. Recipe DB entry:', recipeData?.video_url);

        if (recipeData?.video_url) {
          const { data: postByUrl } = await supabase
            .from('posts')
            .select('*')
            .eq('recipe_url', recipeData.video_url)
            .maybeSingle();

          console.log('[RecipeCard] Found post by URL:', postByUrl ? 'YES' : 'NO');
          postData = postByUrl;
        }
      }

      if (postData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', postData.user_id)
          .maybeSingle();

        const { data: likes } = await supabase
          .from('likes')
          .select('user_id')
          .eq('post_id', postData.id);

        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postData.id);

        setSocialPost({
          ...postData,
          profiles: profile,
          _count: {
            likes: likes?.length || 0,
            comments: commentsCount || 0
          }
        });
        console.log('[RecipeCard] ✅ Social post loaded for recipe:', recipe.id, 'Post ID:', postData.id);
      } else {
        console.log('[RecipeCard] ❌ No social post found for recipe:', recipe.id);
      }
    } catch (error) {
      console.error('[RecipeCard] Failed to load social post:', error);
    }
  };

  useEffect(() => {
    loadReviewData();
    loadSocialPost();
  }, [recipe.id]);

  useEffect(() => {
    console.log('[RecipeCard] Recipe:', recipe.id, 'Review count:', reviewCount, 'Social post:', socialPost ? 'EXISTS' : 'NULL');
  }, [reviewCount, socialPost]);

  const handleSeeReviews = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!socialPost) {
      console.error('[RecipeCard] No social post available');
      return;
    }

    console.log('[RecipeCard] 🎯 Opening post:', socialPost.id);

    // Dispatch the event to open the modal
    window.dispatchEvent(new CustomEvent('open-shared-post', { detail: socialPost.id }));
    
    // Set fallback
    (window as any).__pendingSharedPostId = socialPost.id;

    // Clean up after 2 seconds
    setTimeout(() => {
      delete (window as any).__pendingSharedPostId;
    }, 2000);

    // Navigate to discover page if not already there
    if (window.location.pathname !== '/discover') {
      console.log('[RecipeCard] Navigating to /discover');
      window.history.pushState({}, '', '/discover');
      // Trigger a custom navigation event if your app uses one
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'discover' }));
    }
  };

  return (
    <>
      <Card
        className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-white cursor-pointer active:scale-[0.98]"
        onClick={() => setShowDetail(true)}
      >
        <div className="relative overflow-hidden aspect-square">
          <img
            src={recipe.imageUrl?.includes('instagram.com') || recipe.imageUrl?.includes('cdninstagram.com')
              ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(recipe.imageUrl.replace(/&amp;/g, '&'))}`
              : recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 right-3 flex gap-2">
            {isSaved && (
              <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg">
                <Bookmark className="w-4 h-4 text-rose-500 fill-rose-500" />
              </div>
            )}
            {isAdmin && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this recipe?')) {
                    onDelete(recipe.id);
                  }
                }}
                className="bg-red-600/95 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-red-700 active:scale-95 transition-all touch-manipulation"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-xs"
            >
              {recipe.cuisineType}
            </Badge>

            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight">
              {decodeHtmlEntities(recipe.title)}
            </h3>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">{totalTime} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 flex-shrink-0" />
              <Badge
                variant="outline"
                className={`text-xs ${difficultyColors[recipe.difficulty]}`}
              >
                {recipe.difficulty}
              </Badge>
            </div>
          </div>

          {reviewCount > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <RatingDisplay rating={Math.round(averageRating)} size="sm" />
              <span className="text-sm font-semibold text-gray-700">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">
                ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          {recipe.dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.dietaryTags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {tag}
                </Badge>
              ))}
              {recipe.dietaryTags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-gray-100 text-gray-700"
                >
                  +{recipe.dietaryTags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            className={`w-full min-h-[44px] touch-manipulation active:scale-95 transition-all ${
              isSaved 
                ? "bg-secondary hover:bg-secondary/90 text-white" 
                : "border-gray-300 hover:bg-primary hover:text-white"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSave?.(recipe.id);
            }}
          >
            <Bookmark className={`w-4 h-4 mr-2 flex-shrink-0 ${isSaved ? 'fill-white' : ''}`} />
            <span className="truncate">{isSaved ? 'Saved' : 'Save to "My 🔖 Recipes"'}</span>
          </Button>
          
          <Button
            size="sm"
            className="w-full min-h-[44px] bg-accent hover:bg-accent/90 text-white shadow-md hover:shadow-lg active:scale-95 transition-all touch-manipulation"
            onClick={(e) => {
              e.stopPropagation();
              onCook?.(recipe.id);
            }}
          >
            <Flame className="w-4 h-4 mr-2 flex-shrink-0" />
            Cook
          </Button>
          
          {showReviewButton && (
            <Button
              variant="outline"
              size="sm"
              className="w-full min-h-[44px] border-gray-300 hover:bg-orange-50 hover:border-primary active:scale-95 transition-all touch-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                setShowReviewForm(true);
              }}
            >
              <span className="text-base mr-2 flex-shrink-0">🔥</span>
              {reviewCount > 0 ? (
                <span className="flex items-center gap-2 truncate">
                  <span className="font-semibold">{averageRating.toFixed(1)}</span>
                  <span className="text-gray-500 truncate">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                </span>
              ) : (
                'Write Review'
              )}
            </Button>
          )}
          
          {showReviewButton && socialPost && (
            <Button
              variant="outline"
              size="sm"
              className="w-full min-h-[44px] border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-500 active:scale-95 transition-all touch-manipulation"
              onClick={handleSeeReviews}
            >
              <span className="text-base mr-2 flex-shrink-0">💬</span>
              <span className="flex items-center gap-2 truncate">
                <span>See Reviews</span>
                {socialPost._count?.comments > 0 && (
                  <span className="text-xs bg-orange-100 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                    {socialPost._count.comments}
                  </span>
                )}
              </span>
            </Button>
          )}
        </CardFooter>
      </Card>

      <RecipeDetailModal
        recipe={recipe}
        open={showDetail}
        onOpenChange={setShowDetail}
      />

      <ReviewForm
        recipe={recipe}
        open={showReviewForm}
        onOpenChange={setShowReviewForm}
        onReviewSubmitted={() => {
          loadReviewData();
        }}
      />
    </>
  );
}