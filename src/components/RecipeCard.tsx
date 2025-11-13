import { useState, useEffect } from 'react';
import { Clock, ChefHat, Bookmark, Flame, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter } from './ui/card';
import { Recipe } from '../types/recipe';
import { RecipeDetailModal } from './RecipeDetailModal';
import { useRecipes } from '../context/RecipeContext';
import { RatingDisplay } from './RatingDisplay';
import { getRecipeReviews, getAverageRating } from '../services/reviewService';
import { ReviewForm } from './ReviewForm';

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

  useEffect(() => {
    loadReviewData();
  }, [recipe.id]);

  return (
    <>
      <Card
        className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-white cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={recipe.imageUrl?.includes('instagram.com') || recipe.imageUrl?.includes('cdninstagram.com')
            ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(recipe.imageUrl.replace(/&amp;/g, '&'))}`
            : recipe.imageUrl}
          alt={recipe.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
              className="bg-red-600/95 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 font-medium"
          >
            {recipe.cuisineType}
          </Badge>

          <h3 className="text-xl font-bold text-gray-900 line-clamp-2 leading-tight">
            {recipe.title}
          </h3>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{totalTime} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ChefHat className="w-4 h-4" />
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
            {recipe.dietaryTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0 flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            className={isSaved ? "flex-1 bg-secondary hover:bg-secondary/90 text-white" : "flex-1 border-gray-300 hover:bg-primary hover:text-white transition-all"}
            onClick={(e) => {
              e.stopPropagation();
              onSave?.(recipe.id);
            }}
          >
            <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-white' : ''}`} />
            {isSaved ? 'Saved' : 'Add to My Recipes'}
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-accent hover:bg-accent/90 text-white shadow-md hover:shadow-lg transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onCook?.(recipe.id);
            }}
          >
            <Flame className="w-4 h-4 mr-2" />
            Cook Now
          </Button>
        </div>
        {showReviewButton && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-gray-300 hover:bg-orange-50 hover:border-primary transition-all"
            onClick={(e) => {
              e.stopPropagation();
              setShowReviewForm(true);
            }}
          >
            <span className="text-base mr-2">🔥</span>
            {reviewCount > 0 ? (
              <span className="flex items-center gap-2">
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-gray-500">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
              </span>
            ) : (
              'Write Review'
            )}
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
