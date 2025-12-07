import { useState, useEffect } from 'react';
import { Clock, ChefHat, Bookmark, Flame, Trash2, MoreVertical, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter } from './ui/card';
import { Recipe } from '../types/recipe';
import { RecipeDetailModal } from './RecipeDetailModal';
import { useRecipes } from '../context/RecipeContext';
import { useAuth } from '../context/AuthContext';
import RatingDisplay from './RatingDisplay';
import { getRecipeReviews, getAverageRating } from '../services/reviewService';
import { ReviewForm } from './ReviewForm';
import { supabase } from '../lib/supabase';
import { decodeHtmlEntities } from '@/lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';

interface RecipeCardProps {
  recipe: Recipe;
  onSave?: (recipeId: string) => void;
  onCook?: (recipeId: string) => void;
  onDelete?: (recipeId: string) => void;
  onEdit?: (recipeId: string) => void;
  showReviewButton?: boolean;
  isAdmin?: boolean;
  preloadedSocialPost?: any;
  requireAuth?: boolean;
}

export function RecipeCard({ recipe, onSave, onCook, onDelete, onEdit, showReviewButton = false, isAdmin = false, preloadedSocialPost, requireAuth = false }: RecipeCardProps) {
  const { state } = useRecipes();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showDetail, setShowDetail] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [socialPost, setSocialPost] = useState<any>(null);
  const [loadingSocialPost, setLoadingSocialPost] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const totalTime = recipe.prepTime + recipe.cookTime;
  const isSaved = state.savedRecipes.some(r => r.id === recipe.id);
const [loadingReviews, setLoadingReviews] = useState(false);
  const isOwner = user && recipe.userId === user.id;

  // Removed debug logging
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

useEffect(() => {
  loadReviewData();
  
  // Use pre-loaded data if available
  if (preloadedSocialPost !== undefined) {
    setSocialPost(preloadedSocialPost);
    setLoadingSocialPost(false);
  } else {
    setLoadingSocialPost(false);
  }
}, [recipe.id, preloadedSocialPost]);

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
  className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-white cursor-pointer active:scale-[0.98] flex flex-col h-full"
  onClick={(e) => {
    // Only open modal if clicking the card itself, not buttons or menu
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]')) {
      return;
    }

    if (requireAuth && !user) {
      toast.error('Please sign up or log in to view recipe details');
      return;
    }
    setShowDetail(true);
  }}
>
        <div className="relative overflow-hidden aspect-square bg-gray-100">
          {!imageError && recipe.imageUrl ? (
            <img
              src={recipe.imageUrl?.includes('instagram.com') || recipe.imageUrl?.includes('cdninstagram.com')
                ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(recipe.imageUrl.replace(/&amp;/g, '&'))}`
                : recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
              <ChefHat className="w-16 h-16 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 right-3 flex gap-2">
            {isSaved && (
              <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg">
                <Bookmark className="w-4 h-4 text-rose-500 fill-rose-500" />
              </div>
            )}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="bg-white/95 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-gray-100 active:scale-95 transition-all touch-manipulation"
                >
                  <MoreVertical className="w-4 h-4 text-gray-700" />
                </button>
                {showMenu && (
                  <>
                    {/* Backdrop to close menu when clicking outside */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                      }}
                    />
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onEdit(recipe.id);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left text-sm text-gray-700 rounded-t-lg"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Recipe
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            if (confirm('Are you sure you want to delete this recipe?')) {
                              onDelete(recipe.id);
                            }
                          }}
                          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-left text-sm text-red-600 rounded-b-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t.common.delete}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

<CardContent className="p-4 space-y-3 flex-1">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-xs"
            >
              {recipe.cuisineType}
            </Badge>

         <h3 className="font-bold text-gray-900 leading-tight text-sm sm:text-base lg:text-lg xl:text-xl hyphens-auto break-words">
  {decodeHtmlEntities(recipe.title)}
</h3>
          </div>
       <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">{totalTime} min</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 flex-shrink-0" />
              <Badge
                variant="outline"
                className={`text-xs ${difficultyColors[recipe.difficulty]}`}
              >
                {recipe.difficulty}
              </Badge>
            </div>
          </div>

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

       <CardFooter className="p-3 sm:p-4 pt-0 flex flex-col gap-2">
  <Button
    variant={isSaved ? "default" : "outline"}
    size="sm"
    className={`w-full min-h-[44px] touch-manipulation active:scale-95 transition-all text-xs sm:text-sm ${
      isSaved 
        ? "bg-secondary hover:bg-secondary/90 text-white" 
        : "border-gray-300 hover:bg-primary hover:text-white"
    }`}
    onClick={(e) => {
      e.stopPropagation();
      onSave?.(recipe.id);
    }}
  >
    <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0 ${isSaved ? 'fill-white' : ''}`} />
    <span className="truncate text-xs sm:text-sm leading-tight">
      {isSaved ? t.recipe.saveRecipe : t.recipe.saveRecipe}
    </span>
  </Button>
  
  <Button
    size="sm"
    className="w-full min-h-[44px] bg-accent hover:bg-accent/90 text-white shadow-md hover:shadow-lg active:scale-95 transition-all touch-manipulation text-xs sm:text-sm"
    onClick={(e) => {
      e.stopPropagation();
      onCook?.(recipe.id);
    }}
  >
    <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
    <span className="leading-tight">Cook</span>
  </Button>
  
 {showReviewButton && (
  <>     

    {!loadingSocialPost && socialPost ? (
      <Button
        variant="outline"
        size="sm"
        disabled={loadingReviews}
       className={`w-full min-h-[44px] border-orange-300 text-orange-600 hover:bg-orange-100 hover:border-orange-500 hover:text-orange-700 active:scale-95 transition-all touch-manipulation text-xs sm:text-sm ${
          loadingReviews ? 'opacity-60 cursor-wait' : ''
        }`}
        onClick={async (e) => {
          e.stopPropagation();
          setLoadingReviews(true);
          await new Promise(resolve => setTimeout(resolve, 200));
          handleSeeReviews(e);
          setTimeout(() => setLoadingReviews(false), 500);
        }}
      >
        {loadingReviews ? (
          <>
            <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-2 flex-shrink-0" />
            <span className="leading-tight">Loading...</span>
          </>
        ) : (
          <>
            <span className="text-sm sm:text-base mr-1.5 sm:mr-2 flex-shrink-0">💬</span>
            <span className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0 leading-tight">
              <span>See Reviews</span>
              {socialPost._count?.comments > 0 && (
                <span className="text-xs bg-orange-100 px-1.5 sm:px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                  {socialPost._count.comments}
                </span>
              )}
            </span>
          </>
        )}
      </Button>
    ) : (
      <div className="w-full min-h-[44px] border border-gray-200 rounded-lg bg-gray-50 animate-pulse" />
    )}
  </>
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