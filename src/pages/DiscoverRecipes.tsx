import { useState, useMemo, useEffect } from 'react';
import { RecipeCard } from '../components/RecipeCard';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, TrendingUp, Zap, Star, Leaf, Globe, Heart, Cake, Menu, X as XClose } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { getRecommendedRecipes, getRecommendationInsights } from '../services/recommendationService';
import { CookMode } from '../components/CookMode';
import { Recipe } from '../types/recipe';
import { getAllPublicRecipes, deleteRecipe } from '../services/recipeService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import CommentModal from '../components/CommentModal';
// ADD THIS SKELETON COMPONENT — Paste right after your imports
const RecipeCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
    <div className="bg-gray-300 aspect-square w-full" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-gray-300 rounded w-3/4" />
      <div className="h-4 bg-gray-300 rounded w-1/2" />
      <div className="flex items-center gap-4 mt-4">
        <div className="h-8 w-20 bg-gray-300 rounded-full" />
        <div className="h-8 w-20 bg-gray-300 rounded-full" />
      </div>
      <div className="flex gap-2 mt-3">
        <div className="h-6 w-16 bg-gray-300 rounded-full" />
        <div className="h-6 w-16 bg-gray-300 rounded-full" />
        <div className="h-6 w-16 bg-gray-300 rounded-full" />
      </div>
    </div>
  </div>
);
interface DiscoverProps {
  onNavigate: (page: string) => void;
}

export function Discover({ onNavigate }: DiscoverProps) {
  const { state, dispatch, saveRecipe, removeRecipe } = useRecipes();
  const { user, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [socialPostsMap, setSocialPostsMap] = useState<Map<string, any>>(new Map());
  const [showCuisineFilter, setShowCuisineFilter] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOpenPost = (e: CustomEvent) => {
      setSelectedPostId(e.detail);
    };
    window.addEventListener('open-shared-post' as any, handleOpenPost);
    return () => {
      window.removeEventListener('open-shared-post' as any, handleOpenPost);
    };
  }, []);

  // Add the batch loading function OUTSIDE useEffect
const loadAllSocialPosts = async (recipes: Recipe[]) => {
  try {
    console.log('[Discover] Batch loading social posts...');
    
    const recipeIds = recipes.map(r => r.id);
    
    // Get posts by recipe_id
    const { data: postsByRecipeId } = await supabase
      .from('posts')
      .select('*')
      .in('recipe_id', recipeIds);
    
    // Get recipe video URLs for posts that might be linked by URL
    const { data: recipeUrls } = await supabase
      .from('public_recipes')
      .select('id, video_url, image_url')  // ✅ Also get image_url
      .in('id', recipeIds)
      .not('video_url', 'is', null);
    
    const videoUrls = recipeUrls?.map(r => r.video_url).filter(Boolean) || [];
    const { data: postsByUrl } = videoUrls.length > 0
      ? await supabase.from('posts').select('*').in('recipe_url', videoUrls)
      : { data: [] };
    
    const postMap = new Map<string, any>();
    
    // ✅ Create a recipe lookup map for images
    const recipeImageMap = new Map(
      recipes.map(r => [r.id, r.imageUrl])
    );
    
    // Process posts by recipe_id
    postsByRecipeId?.forEach(post => {
      if (post.recipe_id) {
        // ✅ If post doesn't have image, use recipe image
        if (!post.image_url && recipeImageMap.has(post.recipe_id)) {
          post.image_url = recipeImageMap.get(post.recipe_id);
        }
        postMap.set(post.recipe_id, post);
      }
    });
    
    // Process posts by URL
    const urlToRecipeMap = new Map(recipeUrls?.map(r => [r.video_url, r.id]) || []);
    postsByUrl?.forEach(post => {
      const recipeId = urlToRecipeMap.get(post.recipe_url) as string | undefined;
      if (recipeId && !postMap.has(recipeId)) {
        // ✅ If post doesn't have image, use recipe image
        if (!post.image_url && recipeImageMap.has(recipeId)) {
          post.image_url = recipeImageMap.get(recipeId) as string;
        }
        postMap.set(recipeId, post);
      }
    });
    
    const allPostIds = Array.from(postMap.values()).map(p => p.id);
    
    if (allPostIds.length > 0) {
      const [profilesData, likesData, commentsData] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url')
          .in('id', Array.from(postMap.values()).map(p => p.user_id)),
        supabase.from('likes').select('post_id, user_id').in('post_id', allPostIds),
        supabase.from('comments').select('post_id').in('post_id', allPostIds)
      ]);
      
      const profileMap = new Map(profilesData.data?.map(p => [p.id, p]) || []);
      
      const likesMap = new Map<string, number>();
      likesData.data?.forEach(like => {
        likesMap.set(like.post_id, (likesMap.get(like.post_id) || 0) + 1);
      });

      const commentsMap = new Map<string, number>();
      commentsData.data?.forEach(comment => {
        commentsMap.set(comment.post_id, (commentsMap.get(comment.post_id) || 0) + 1);
      });

      const enrichedMap = new Map<string, any>();
      postMap.forEach((post, recipeId) => {
        enrichedMap.set(recipeId, {
          ...post,
          profiles: profileMap.get(post.user_id),
          _count: {
            likes: likesMap.get(post.id) || 0,
            comments: commentsMap.get(post.id) || 0
          }
        });
      });
      
      setSocialPostsMap(enrichedMap);
      console.log('[Discover] ✅ Loaded', enrichedMap.size, 'social posts with images');
    }
  } catch (error) {
    console.error('[Discover] Failed to batch load social posts:', error);
  }
};

useEffect(() => {
  const loadRecipes = async () => {
    try {
      console.log('[Discover] Loading recipes from database...');
      const dbRecipes = await getAllPublicRecipes();
      console.log('[Discover] Loaded', dbRecipes.length, 'recipes from database');
      setAllRecipes(dbRecipes);

      await loadAllSocialPosts(dbRecipes);
    } catch (error) {
      console.error('Failed to load recipes:', error);
      setAllRecipes([]);
    }
  };

  loadRecipes();

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      loadRecipes();
    }
  };

  const handleRecipeCreated = () => {
    console.log('[Discover] Recipe created event received, refreshing...');
    loadRecipes();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('recipe-created', handleRecipeCreated);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('recipe-created', handleRecipeCreated);
  };
}, []);

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      await deleteRecipe(recipeId);
      setAllRecipes(allRecipes.filter(r => r.id !== recipeId));
      toast.success('Recipe deleted successfully');
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      toast.error('Failed to delete recipe');
    }
  };

  const handleEditRecipe = (recipeId: string) => {
    // Navigate with full page reload to ensure URL parameters are read
    window.location.href = `/add-recipe?edit=${recipeId}`;
  };

  const cuisines = useMemo(() => {
    const cuisineSet = new Set(allRecipes.map((r) => r.cuisineType));
    return Array.from(cuisineSet).sort();
  }, [allRecipes]);

  const filteredRecipes = useMemo(() => {
    return allRecipes.filter((recipe) => {
      const matchesSearch =
        searchQuery === '' ||
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        recipe.ingredients.some((ingredient) =>
          ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesCuisine =
        !selectedCuisine || recipe.cuisineType === selectedCuisine;

      return matchesSearch && matchesCuisine;
    });
  }, [searchQuery, selectedCuisine, allRecipes]);

  const [showAllTrending, setShowAllTrending] = useState(false);
  const [showAllQuick, setShowAllQuick] = useState(false);
  const [showAllHealthy, setShowAllHealthy] = useState(false);
  const [showAllInternational, setShowAllInternational] = useState(false);
  const [showAllPetMeals, setShowAllPetMeals] = useState(false);
  const [showAllBakedGoods, setShowAllBakedGoods] = useState(false);

  const trendingRecipes = useMemo(() => {
    const sorted = [...allRecipes]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return showAllTrending ? sorted : sorted.slice(0, isMobile ? 6 : 12);
  }, [allRecipes, showAllTrending, isMobile]);

  const quickEasyRecipes = useMemo(() => {
    const filtered = allRecipes
      .filter((r) => r.prepTime + r.cookTime <= 30 && r.difficulty === 'Easy');
    return showAllQuick ? filtered : filtered.slice(0, isMobile ? 6 : 12);
  }, [allRecipes, showAllQuick, isMobile]);

  const healthyRecipes = useMemo(() => {
    const filtered = allRecipes
      .filter((r) => r.dietaryTags.includes('Vegetarian') || r.dietaryTags.includes('Vegan'));
    return showAllHealthy ? filtered : filtered.slice(0, isMobile ? 6 : 12);
  }, [allRecipes, showAllHealthy, isMobile]);

  const internationalRecipes = useMemo(() => {
    const cuisines = ['Thai', 'Japanese', 'Korean', 'Indian', 'Middle Eastern', 'Mexican', 'Vietnamese', 'Vegan/Vegetarian'];
    const filtered = allRecipes
      .filter((r) => cuisines.includes(r.cuisineType));
    return showAllInternational ? filtered : filtered.slice(0, isMobile ? 6 : 12);
  }, [allRecipes, showAllInternational, isMobile]);

  const petMealsRecipes = useMemo(() => {
    const filtered = allRecipes
      .filter((r) => r.cuisineType === 'Pet Meals');
    return showAllPetMeals ? filtered : filtered.slice(0, isMobile ? 6 : 12);
  }, [allRecipes, showAllPetMeals, isMobile]);

  const bakedGoodsRecipes = useMemo(() => {
    const filtered = allRecipes
      .filter((r) => r.cuisineType === 'Culinary/Baked Goods');
    return showAllBakedGoods ? filtered : filtered.slice(0, isMobile ? 6 : 12);
  }, [allRecipes, showAllBakedGoods, isMobile]);

  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    const updateRecommendations = () => {
      const recommendations = getRecommendedRecipes(
        allRecipes,
        state.savedRecipes,
        state.userPreferences,
        isMobile ? 6 : 6
      );
      setRecommendedRecipes(recommendations);
    };

    updateRecommendations();
  }, [allRecipes, state.savedRecipes, state.userPreferences, isMobile]);

  const recommendationInsight = useMemo(() => {
    return getRecommendationInsights(state.savedRecipes);
  }, [state.savedRecipes]);

  const handleSave = async (recipeId: string) => {
    if (!user) {
      toast.error('Please sign up or log in to save recipes');
      return;
    }
    const recipe = allRecipes.find(r => r.id === recipeId);
    if (recipe) {
      const isAlreadySaved = state.savedRecipes.some(r => r.id === recipeId);
      try {
        if (isAlreadySaved) {
          await removeRecipe(recipeId);
          toast.success('Recipe removed from collection');
        } else {
          await saveRecipe(recipe);
          toast.success('Recipe saved to your collection');
        }
      } catch (error) {
        toast.error('Failed to update recipe');
      }
    }
  };

  const handleCook = (recipeId: string) => {
    if (!user) {
      toast.error('Please sign up or log in to use cook mode');
      return;
    }
    const recipe = allRecipes.find(r => r.id === recipeId);
    if (recipe) {
      console.log('Cook clicked for:', recipe.title);
      setCookingRecipe(recipe);
    }
  };

  const RecipeSection = ({ title, subtitle, icon: Icon, recipes, showAll, onToggle, allCount, buttonColor }: any) => (
  <section>
    <div className="flex items-center gap-3 mb-6">
      <div className={`bg-gradient-to-r ${buttonColor} p-2 rounded-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          {title}
        </h2>
        <p className="text-sm md:text-base text-gray-600">
          {subtitle}
        </p>
      </div>
    </div>
    {/* ✅ ADDED: auto-rows-fr makes all rows same height */}
  <div className={`grid gap-4 md:gap-6 auto-rows-fr ${
  isMobile
    ? 'grid-cols-2'
    : 'grid-cols-2 lg:grid-cols-3'
}`}>

     {recipes.map((recipe: Recipe) => (
  <RecipeCard
    key={recipe.id}
    recipe={recipe}
    onSave={handleSave}
    onCook={handleCook}
    onDelete={handleDeleteRecipe}
    onEdit={handleEditRecipe}
    isAdmin={isAdmin}
    showReviewButton={true}
    preloadedSocialPost={socialPostsMap.get(recipe.id) || null}
  />
))}
    </div>
    {allCount > (isMobile ? 6 : 12) && (
      <div className="text-center mt-8">
        <Button
          onClick={() => onToggle(!showAll)}
          variant="outline"
          size="lg"
          className={`text-sm md:text-base`}
        >
          {showAll ? 'Show Less' : 'Show More'}
        </Button>
      </div>
    )}
  </section>
);

  // SKELETON LOADING FOR RECIPE DISCOVER PAGE
  if (allRecipes.length === 0 && !searchQuery && !selectedCuisine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
          <div className="text-center mb-12">
            <div className="h-12 bg-gray-300 rounded-xl w-96 mx-auto mb-4 animate-pulse" />
            <div className="h-6 bg-gray-300 rounded-lg w-80 mx-auto animate-pulse" />
          </div>
          <div className="mb-12">
            <div className="h-14 bg-gray-200 rounded-2xl w-full max-w-2xl mx-auto animate-pulse" />
          </div>
          <div className="space-y-16">
            {[...Array(6)].map((_, i) => (
              <section key={i}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gray-300 rounded-xl animate-pulse" />
                  <div>
                    <div className="h-9 bg-gray-300 rounded-lg w-72 animate-pulse" />
                    <div className="h-6 bg-gray-300 rounded-lg w-56 mt-3 animate-pulse" />
                  </div>
                </div>
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'} auto-rows-fr`}>
                  {[...Array(isMobile ? 4 : 8)].map((_, j) => (
                    <RecipeCardSkeleton key={j} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
        {/* Sign Up Banner for non-authenticated users */}
        {!user && (
          <div className="mb-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold mb-1">Join MealScrape Today!</h3>
                <p className="text-sm opacity-90">Sign up to save recipes, create meal plans, and connect with food lovers</p>
              </div>
              <Button
                onClick={() => onNavigate('discover')}
                className="bg-white text-orange-600 hover:bg-gray-100 font-semibold px-8 py-3 rounded-full shadow-md"
              >
                Sign Up Free
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-3 md:mb-4">
            Discover Amazing Recipes
          </h1>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto mb-2">
            Recipes scraped from <span className="font-semibold text-blue-600">Social Media</span> and the <span className="font-semibold text-blue-600">Web</span>
          </p>
          <p className="text-xs md:text-sm text-gray-500 max-w-2xl mx-auto">
   Meal Calendar • Shopping List • Social Community
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 md:mb-12 space-y-4 md:space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search recipes, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 md:h-14 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500 shadow-sm"
            />
          </div>

          {/* Cuisine Filter */}
          {isMobile ? (
            <div className="space-y-3">
              <button
                onClick={() => setShowCuisineFilter(!showCuisineFilter)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">
                  {selectedCuisine ? `Cuisine: ${selectedCuisine}` : 'Filter by Cuisine'}
                </span>
                {showCuisineFilter ? (
                  <XClose className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
              {showCuisineFilter && (
                <div className="space-y-2 bg-white border border-gray-200 rounded-lg p-3">
                  <Button
                    variant={selectedCuisine === null ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedCuisine(null);
                      setShowCuisineFilter(false);
                    }}
                    size="sm"
                    className={`w-full justify-start ${
                      selectedCuisine === null ? 'bg-orange-500 hover:bg-orange-600' : ''
                    }`}
                  >
                    All Cuisines
                  </Button>
                  {cuisines.map((cuisine) => (
                    <Button
                      key={cuisine}
                      variant={selectedCuisine === cuisine ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedCuisine(cuisine);
                        setShowCuisineFilter(false);
                      }}
                      size="sm"
                      className={`w-full justify-start text-sm ${
                        selectedCuisine === cuisine ? 'bg-orange-500 hover:bg-orange-600' : ''
                      }`}
                    >
                      {cuisine}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant={selectedCuisine === null ? 'default' : 'outline'}
                onClick={() => setSelectedCuisine(null)}
                size="sm"
                className={selectedCuisine === null ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                All Cuisines
              </Button>
              {cuisines.map((cuisine) => (
                <Button
                  key={cuisine}
                  variant={selectedCuisine === cuisine ? 'default' : 'outline'}
                  onClick={() => setSelectedCuisine(cuisine)}
                  size="sm"
                  className={selectedCuisine === cuisine ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  {cuisine}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {searchQuery === '' && selectedCuisine === null ? (
          <div className="space-y-12 md:space-y-16">
            <RecipeSection
              title="Trending Now"
              subtitle="Most popular recipes this week"
              icon={TrendingUp}
              recipes={trendingRecipes}
              showAll={showAllTrending}
              onToggle={setShowAllTrending}
              allCount={allRecipes.length}
              buttonColor="from-orange-500 to-rose-500"
            />

            <RecipeSection
              title="Quick & Easy"
              subtitle="Delicious meals ready in 30 minutes or less"
              icon={Zap}
              recipes={quickEasyRecipes}
              showAll={showAllQuick}
              onToggle={setShowAllQuick}
              allCount={allRecipes.filter((r) => r.prepTime + r.cookTime <= 30 && r.difficulty === 'Easy').length}
              buttonColor="from-emerald-500 to-teal-500"
            />

            <RecipeSection
              title="Healthy Options"
              subtitle="Vegetarian and vegan recipes for a lighter meal"
              icon={Leaf}
              recipes={healthyRecipes}
              showAll={showAllHealthy}
              onToggle={setShowAllHealthy}
              allCount={allRecipes.filter((r) => r.dietaryTags.includes('Vegetarian') || r.dietaryTags.includes('Vegan')).length}
              buttonColor="from-green-500 to-emerald-500"
            />

            <RecipeSection
              title="International Flavors"
              subtitle="Explore cuisines from around the world"
              icon={Globe}
              recipes={internationalRecipes}
              showAll={showAllInternational}
              onToggle={setShowAllInternational}
              allCount={allRecipes.filter((r) => ['Thai', 'Japanese', 'Korean', 'Indian', 'Middle Eastern', 'Mexican', 'Vietnamese'].includes(r.cuisineType)).length}
              buttonColor="from-amber-500 to-orange-500"
            />

            {petMealsRecipes.length > 0 && (
              <RecipeSection
                title="Pet Meals & Treats"
                subtitle="Homemade recipes for your furry friends"
                icon={Heart}
                recipes={petMealsRecipes}
                showAll={showAllPetMeals}
                onToggle={setShowAllPetMeals}
                allCount={allRecipes.filter((r) => r.cuisineType === 'Pet Meals').length}
                buttonColor="from-pink-500 to-rose-500"
              />
            )}

            {bakedGoodsRecipes.length > 0 && (
              <RecipeSection
                title="Culinary & Baked Goods"
                subtitle="From artisan breads to elegant pastries"
                icon={Cake}
                recipes={bakedGoodsRecipes}
                showAll={showAllBakedGoods}
                onToggle={setShowAllBakedGoods}
                allCount={allRecipes.filter((r) => r.cuisineType === 'Culinary/Baked Goods').length}
                buttonColor="from-amber-500 to-orange-500"
              />
            )}

            <RecipeSection
              title="Recommended for You"
              subtitle={recommendationInsight}
              icon={Star}
              recipes={recommendedRecipes}
              showAll={false}
              onToggle={() => {}}
              allCount={recommendedRecipes.length}
              buttonColor="from-blue-500 to-cyan-500"
            />
          </div>
        ) : (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Search Results
              </h2>
              <p className="text-gray-600">
                Found {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
              </p>
            </div>
            {filteredRecipes.length > 0 ? (
              <div className={`grid gap-4 md:gap-6 auto-rows-fr ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
   {filteredRecipes.map((recipe) => (
  <RecipeCard
    key={recipe.id}
    recipe={recipe}
    onSave={handleSave}
    onCook={handleCook}
    onDelete={handleDeleteRecipe}
    onEdit={handleEditRecipe}
    isAdmin={isAdmin}
    showReviewButton={true}
    preloadedSocialPost={socialPostsMap.get(recipe.id) || null}
  />
))}
  </div>
) : (
  <div className="text-center py-12">
    <p className="text-lg text-gray-500">
      No recipes found. Try adjusting your search.
    </p>
  </div>
)}

          </section>
        )}
      </div>

      {cookingRecipe && (
        <CookMode
          recipe={cookingRecipe}
          onClose={() => setCookingRecipe(null)}
        />
      )}
      {selectedPostId && (
        <CommentModal
          postId={selectedPostId}
          isOpen={!!selectedPostId}
          onClose={() => setSelectedPostId(null)}
          onCommentPosted={() => {}}
        />
      )}
    </div>
  );
}