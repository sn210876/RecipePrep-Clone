import { useState, useEffect } from 'react';
import { Recipe } from '../types/recipe';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
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
import { RatingDisplay } from './RatingDisplay';
import {
  getRecipeReviews,
  getUserReview,
  deleteReview,
  getAverageRating,
  ReviewWithImages,
} from '../services/reviewService';
import { toast } from 'sonner';

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
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        {onClose && (
          <Button variant="ghost" onClick={onClose} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}
      </div>

      <div className="relative mb-8 rounded-2xl overflow-hidden shadow-xl">
        {recipe.videoUrl ? (
          <div className="aspect-video w-full bg-black">
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
            src={recipe.imageUrl?.includes('instagram.com') || recipe.imageUrl?.includes('cdninstagram.com')
              ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(recipe.imageUrl.replace(/&amp;/g, '&'))}`
              : recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-96 object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <h1 className="text-5xl font-bold mb-4">{recipe.title}</h1>
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="font-medium">View Original Recipe</span>
            </a>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/90 text-gray-900 hover:bg-white">
              {recipe.cuisineType}
            </Badge>
            {recipe.dietaryTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-white/80 text-gray-900"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Time</p>
              <p className="text-xl font-bold text-gray-900">
                {recipe.prepTime + recipe.cookTime} min
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCookMode(true)}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Servings</p>
              <p className="text-xl font-bold text-gray-900">
                {recipe.servings}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-amber-100 p-3 rounded-lg">
              <ChefHat className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Difficulty</p>
              <p className="text-xl font-bold text-gray-900">
                {recipe.difficulty}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasSteps && (
        <div className="mb-8">
          <Button
            size="lg"
            onClick={() => setCookMode(true)}
            className="w-full bg-accent hover:bg-accent/90 text-white text-lg py-8 gap-3 shadow-lg hover:shadow-xl transition-all"
          >
            <PlayCircle className="w-7 h-7" />
            Start Cooking
          </Button>
          <p className="text-center text-sm text-gray-600 mt-3">
            Full-screen mode with ingredient checklist, timers, and step-by-step guidance
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <span className="text-gray-700">
                    <span className="font-semibold">
                      {ingredient.quantity} {ingredient.unit}
                    </span>{' '}
                    {ingredient.name}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 pt-1">{instruction}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 pt-8 border-t">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Reviews & Ratings</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <RatingDisplay rating={Math.round(averageRating)} />
                <span className="text-lg font-semibold text-gray-700">
                  {averageRating.toFixed(1)}
                </span>
              </div>
              <span className="text-gray-600">({reviews.length} reviews)</span>
            </div>
          </div>
          {!showReviewForm && (
            <Button
              onClick={() => setShowReviewForm(true)}
              className="bg-secondary hover:bg-secondary/90"
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
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 mb-3 font-medium">Your Review</p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Reviews</h3>
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
          <div className="text-center py-8 text-gray-500">
            <p>No reviews yet. Be the first to review this recipe!</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
