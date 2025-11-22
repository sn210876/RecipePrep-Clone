import { useState, useEffect } from 'react';
import { Recipe } from '../types/recipe';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { getProxiedImageUrl } from '@/lib/imageUtils';
import {
  ChevronLeft,
  Clock,
  Users,
  ChefHat,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import { CookMode } from './CookMode';
import { ReviewForm } from './ReviewForm';
import { ReviewCard } from './ReviewCard';
import RatingDisplay from './RatingDisplay';
import {
  getRecipeReviews,
  getUserReview,
  deleteReview,
  getAverageRating,
  ReviewWithImages,
} from '../services/reviewService';
import { toast } from 'sonner';
import { decodeHtmlEntities } from '@/lib/utils';

interface RecipeDetailViewProps {
  recipe: Recipe;
  onClose?: () => void;
}

export function RecipeDetailView({ recipe, onClose }: RecipeDetailViewProps) {
  const [cookMode, setCookMode] = useState(false);
  const [reviews, setReviews] = useState<ReviewWithImages[]>([]);
  const [userReview, setUserReview] = useState<ReviewWithImages | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const hasSteps = recipe.steps && recipe.steps.length > 0;

  useEffect(() => {
    loadReviews();
  }, [recipe.id]);

  const loadReviews = async () => {
    try {
      const allReviews = await getRecipeReviews(recipe.id);
      setReviews(allReviews);

      const avgRating = await getAverageRating(recipe.id);
      setAverageRating(avgRating);

      try {
        const user = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          },
        }).then(r => r.json());

        if (user?.id) {
          const own = await getUserReview(recipe.id, user.id);
          setUserReview(own);
        }
      } catch {
        setUserReview(null);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      await deleteReview(reviewId);
      toast.success('Review deleted');
      await loadReviews();
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  if (cookMode && hasSteps) {
    return <CookMode recipe={recipe} onClose={() => setCookMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Back Button */}
      {onClose && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="gap-2 min-h-[44px] touch-manipulation active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </Button>
        </div>
      )}

      {/* Hero Section - Video or Image */}
      <div className="relative bg-black">
        {recipe.videoUrl ? (
          <div className="aspect-video w-full">
            <iframe
              src={recipe.videoUrl.includes('instagram.com')
                ? `https://www.instagram.com/p/${recipe.videoUrl.split('/p/')[1]?.split('/')[0]}/embed/`
                : recipe.videoUrl.includes('tiktok.com')
                ? `https://www.tiktok.com/embed/${recipe.videoUrl.split('/video/')[1]?.split('?')[0]}`
                : recipe.videoUrl.includes('youtube.com') || recipe.videoUrl.includes('youtu.be')
                ? `https://www.youtube.com/embed/${recipe.videoUrl.includes('youtu.be') ? recipe.videoUrl.split('youtu.be/')[1] : recipe.videoUrl.split('v=')[1]?.split('&')[0]}`
                : recipe.videoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
        <img
  src={getProxiedImageUrl(recipe.imageUrl)}
  alt={recipe.title}
  className="w-full h-64 object-cover"
  loading="lazy"
/>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h1 className="text-2xl font-bold mb-3 leading-tight">{decodeHtmlEntities(recipe.title)}</h1>
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mb-3 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all text-sm min-h-[40px] touch-manipulation active:scale-95"
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">View Original</span>
            </a>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Badge className="bg-white/95 text-gray-900 hover:bg-white text-xs">
              {recipe.cuisineType}
            </Badge>
            {recipe.dietaryTags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-white/90 text-gray-900 text-xs"
              >
                {tag}
              </Badge>
            ))}
            {recipe.dietaryTags.length > 3 && (
              <Badge variant="secondary" className="bg-white/90 text-gray-900 text-xs">
                +{recipe.dietaryTags.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center gap-2 p-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-sm font-bold text-gray-900">
                  {recipe.prepTime + recipe.cookTime}m
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center gap-2 p-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Serves</p>
                <p className="text-sm font-bold text-gray-900">
                  {recipe.servings}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center gap-2 p-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <ChefHat className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Level</p>
                <p className="text-xs font-bold text-gray-900">
                  {recipe.difficulty}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Start Cooking Button */}
        {hasSteps && (
          <div className="mb-4">
            <Button
              size="lg"
              onClick={() => setCookMode(true)}
              className="w-full bg-accent hover:bg-accent/90 text-white text-base min-h-[52px] gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all touch-manipulation"
            >
              <PlayCircle className="w-5 h-5 flex-shrink-0" />
              Start Cooking
            </Button>
            <p className="text-center text-xs text-gray-600 mt-2 px-2">
              Step-by-step mode with timers and ingredient checklist
            </p>
          </div>
        )}

        {/* Ingredients & Instructions */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-gray-700 leading-relaxed">
                      <span className="font-semibold">
                        {decodeHtmlEntities(ingredient.quantity)} {decodeHtmlEntities(ingredient.unit)}
                      </span>{' '}
                      {decodeHtmlEntities(ingredient.name)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700 pt-0.5 leading-relaxed">
                      {decodeHtmlEntities(instruction)}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Source Link */}
        {recipe.sourceUrl && (
          <Card className="mt-4 border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Source</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all min-h-[40px]"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                <span className="break-all">{recipe.sourceUrl}</span>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-3">Reviews & Ratings</h2>
              <div className="flex items-center gap-3">
                <RatingDisplay rating={Math.round(averageRating)} size="sm" />
                <span className="text-base font-semibold text-gray-700">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-gray-600">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
              </div>
            </div>
            {!showReviewForm && (
              <Button
                onClick={() => setShowReviewForm(true)}
                className="w-full bg-secondary hover:bg-secondary/90 min-h-[48px] touch-manipulation active:scale-95 transition-all"
              >
                {userReview ? 'Edit Your Review' : 'Add Your Review'}
              </Button>
            )}
          </div>

          <ReviewForm
            recipe={recipe}
            open={showReviewForm}
            onOpenChange={setShowReviewForm}
            onReviewSubmitted={loadReviews}
          />

          {userReview && !showReviewForm && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 mb-3 font-medium">Your Review</p>
              <ReviewCard
                id={userReview.id}
                rating={userReview.rating}
                comment={userReview.comment}
                images={userReview.images}
                author="You"
                createdAt={userReview.created_at}
                isOwn={true}
                onEdit={() => setShowReviewForm(true)}
                onDelete={() => handleDeleteReview(userReview.id)}
              />
            </div>
          )}

          {reviews.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Other Reviews</h3>
              {reviews
                .filter((r) => r.id !== userReview?.id)
                .map((review) => (
                  <ReviewCard
                    key={review.id}
                    id={review.id}
                    rating={review.rating}
                    comment={review.comment}
                    images={review.images}
                    author={review.user_id || 'Anonymous'}
                    createdAt={review.created_at}
                    isOwn={false}
                  />
                ))}
            </div>
          ) : !showReviewForm ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <p>No reviews yet. Be the first to review this recipe!</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}