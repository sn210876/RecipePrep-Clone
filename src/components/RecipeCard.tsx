import { useState, useEffect } from 'react';
import { Clock, ChefHat, Bookmark, Flame } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter } from './ui/card';
import { Recipe } from '../types/recipe';
import { RecipeDetailModal } from './RecipeDetailModal';
import { useRecipes } from '../context/RecipeContext';
import { RatingDisplay } from './RatingDisplay';
import { getRecipeReviews, getAverageRating } from '../services/reviewService';

interface RecipeCardProps {
  recipe: Recipe;
  onSave?: (recipeId: string) => void;
  onCook?: (recipeId: string) => void;
}

export function RecipeCard({ recipe, onSave, onCook }: RecipeCardProps) {
  const { state } = useRecipes();
  const [showDetail, setShowDetail] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const totalTime = recipe.prepTime + recipe.cookTime;
  const isSaved = state.savedRecipes.some(r => r.id === recipe.id);

  const difficultyColors = {
    Easy: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-amber-100 text-amber-700 border-amber-200',
    Hard: 'bg-red-100 text-red-700 border-red-200',
  };

  useEffect(() => {
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

      <CardFooter className="p-5 pt-0 flex gap-2">
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
          {isSaved ? 'Saved' : 'Add to Recipe'}
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
      </CardFooter>
    </Card>

      <RecipeDetailModal
        recipe={recipe}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
}
