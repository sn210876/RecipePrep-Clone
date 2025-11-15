import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Clock, Users, ChefHat, Link2, Sparkles, Loader2 } from 'lucide-react';
import { useRecipes } from '@/context/RecipeContext';
import { Ingredient } from '@/types/recipe';
import { toast } from 'sonner';
import { extractRecipeFromUrl, isValidUrl, getPlatformFromUrl, type ExtractedRecipeData } from '@/services/recipeExtractor';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

function parseTimeValue(value: string | number): number {
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  if (/^PT\d+[HM]$/i.test(str)) {
    const hours = str.match(/PT(\d+)H/i);
    const minutes = str.match(/PT(\d+)M/i) || str.match(/(\d+)M/i);
    return (hours ? parseInt(hours[1]) * 60 : 0) + (minutes ? parseInt(minutes[1]) : 0);
  }

  const num = parseInt(str);
  return isNaN(num) ? 0 : num;
}

function parseServingsValue(value: string | number): number {
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  const match = str.match(/(\d+)/);
  const num = match ? parseInt(match[1]) : parseInt(str);
  return isNaN(num) ? 1 : num;
}

const UNITS = [
  'cup', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l',
  'piece', 'whole', 'pinch', 'dash', 'to taste'
];

const CUISINE_TYPES = [
  'American', 'Chinese', 'Culinary/Baked Goods', 'French', 'Indian', 'Italian',
  'Japanese', 'Korean', 'Mediterranean', 'Mexican', 'Other', 'Pet Meals',
  'Thai', 'Vegan/Vegetarian', 'Vietnamese'
];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

const DIETARY_TAGS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Keto', 'Paleo', 'Low-Carb', 'High-Protein'
];

interface AddRecipeProps {
  onNavigate?: (page: string) => void;
}

export function AddRecipe({ onNavigate }: AddRecipeProps = {}) {
  const { dispatch } = useRecipes();

  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { quantity: '', unit: 'cup', name: '' }
  ]);
  const [instructions, setInstructions] = useState(['']);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>([]);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedRecipeData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const addIngredient = () => {
    setIngredients([...ingredients, { quantity: '', unit: 'cup', name: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const toggleMealType = (mealType: string) => {
    setSelectedMealTypes(prev =>
      prev.includes(mealType)
        ? prev.filter(t => t !== mealType)
        : [...prev, mealType]
    );
  };

  const toggleDietaryTag = (tag: string) => {
    setSelectedDietaryTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleUrlExtract = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    if (!isValidUrl(urlInput)) {
      toast.error('Please enter a valid URL');
      return;
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const isImageUrl = imageExtensions.some(ext => urlInput.toLowerCase().includes(ext));

    if (isImageUrl) {
      toast.error('Please paste a recipe page URL, not a direct image link. Enter the recipe page URL instead.');
      return;
    }

    setIsExtracting(true);
    const platform = getPlatformFromUrl(urlInput);

    try {
      const data = await extractRecipeFromUrl(urlInput);
      setExtractedData(data);
      setShowPreview(true);
      toast.success(`Recipe extracted from ${platform}! Review and edit before saving.`);
    } catch (error: any) {
      console.error('Extract error:', error);
      toast.error(error.message || 'Failed to extract recipe. Please try manual entry.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAcceptExtraction = () => {
    if (!extractedData) return;

    console.log('[AddRecipe] Accepting extraction');
    console.log('[AddRecipe] Extracted ingredients:', extractedData.ingredients);
    console.log('[AddRecipe] Extracted instructions:', extractedData.instructions);

    setTitle(extractedData.title.replace(/\s+on\s+instagram$/i, ''));

    // Ensure ingredients have proper structure
    const normalizedIngredients = extractedData.ingredients.map(ing => ({
      quantity: ing.quantity || '',
      unit: ing.unit || 'cup',
      name: ing.name || ''
    }));

    console.log('[AddRecipe] Normalized ingredients:', normalizedIngredients);
    setIngredients(normalizedIngredients);

    setInstructions(extractedData.instructions);
    setPrepTime(String(parseTimeValue(extractedData.prepTime)));
    setCookTime(String(parseTimeValue(extractedData.cookTime)));
    setServings(String(parseServingsValue(extractedData.servings)));
    setCuisineType(extractedData.cuisineType);
    setDifficulty(extractedData.difficulty);
    setSelectedMealTypes(extractedData.mealTypes);
    setSelectedDietaryTags(extractedData.dietaryTags);
    setImageUrl(extractedData.imageUrl);
    setVideoUrl(extractedData.videoUrl || '');
    const sourceNote = urlInput ? `Source: ${urlInput}\n\n` : '';
    setNotes(sourceNote + (extractedData.notes || ''));

    setShowPreview(false);
    setExtractedData(null);

    toast.success('Recipe loaded! Edit any details as needed.');
  };

  const handleCancelExtraction = () => {
    setShowPreview(false);
    setExtractedData(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!cuisineType) newErrors.cuisineType = 'Cuisine type is required';
    if (!prepTime || parseInt(prepTime) <= 0) newErrors.prepTime = 'Valid prep time is required';
    if (!cookTime || parseInt(cookTime) <= 0) newErrors.cookTime = 'Valid cook time is required';
    if (!servings || parseInt(servings) <= 0) newErrors.servings = 'Valid servings count is required';
    if (selectedMealTypes.length === 0) newErrors.mealTypes = 'Select at least one meal type';

    const validIngredients = ingredients.filter(
      ing => ing.name.trim()
    );
    if (validIngredients.length === 0) {
      newErrors.ingredients = 'Add at least one ingredient';
    }

    const validInstructions = instructions.filter(inst => inst.trim());
    if (validInstructions.length === 0) {
      newErrors.instructions = 'Add at least one instruction';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AddRecipe] Form submitted');
    setShowErrors(true);

    if (!validate()) {
      console.log('[AddRecipe] Validation failed, errors:', errors);
      toast.error('Please fill in all required fields');
      return;
    }

    const validIngredients = ingredients.filter(
      ing => ing.name.trim()
    );
    const validInstructions = instructions.filter(inst => inst.trim());

    console.log('[AddRecipe] Valid ingredients:', validIngredients.length);
    console.log('[AddRecipe] Valid instructions:', validInstructions.length);

    const newRecipe = {
      title: title.trim(),
      ingredients: validIngredients,
      instructions: validInstructions,
      prepTime: parseTimeValue(prepTime),
      cookTime: parseTimeValue(cookTime),
      servings: parseServingsValue(servings),
      tags: [...selectedMealTypes, ...selectedDietaryTags],
      cuisineType,
      difficulty,
      dietaryTags: selectedDietaryTags,
      mealType: selectedMealTypes,
      imageUrl: imageUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      sourceUrl: urlInput.trim() || undefined,
      notes: notes.trim() || undefined,
      isSaved: true
    };

    console.log('[AddRecipe] Creating recipe:', newRecipe);

    try {
      const { createRecipe } = await import('@/services/recipeService');
      console.log('[AddRecipe] Calling createRecipe...');
      const createdRecipe = await createRecipe(newRecipe);
      console.log('[AddRecipe] Recipe created:', createdRecipe);

      dispatch({ type: 'SAVE_RECIPE', payload: createdRecipe });

      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const postImageUrl = imageUrl.trim()
            ? (imageUrl.includes('instagram.com') || imageUrl.includes('cdninstagram.com')
              ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(imageUrl.replace(/&amp;/g, '&'))}`
              : imageUrl.trim())
            : null;

          const { error: postError } = await supabase.from('posts').insert({
            user_id: user.id,
            title: title.trim(),
            image_url: postImageUrl,
            video_url: videoUrl.trim() || null,
            caption: notes.trim() || 'Check out my recipe!',
            recipe_url: videoUrl.trim() || urlInput.trim() || null,
            recipe_id: createdRecipe.id,
          });

          if (postError) {
            console.error('[AddRecipe] Failed to create social post:', postError);
            toast.success('Recipe created successfully!');
          } else {
            console.log('[AddRecipe] Social post created successfully');
            toast.success('Recipe created and posted to your profile!');
          }
        } else {
          toast.success('Recipe created successfully!');
        }
      } catch (postError) {
        console.error('[AddRecipe] Failed to create social post:', postError);
        toast.success('Recipe created successfully!');
      }

      if (onNavigate) {
        onNavigate('my-recipes');
      }
    } catch (error: any) {
      console.error('[AddRecipe] Failed to create recipe:', error);
      const errorMessage = error?.message || 'Failed to create recipe. Please try again.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Create New Recipe</h1>
          <p className="text-slate-600">Share your culinary creation with the community</p>
        </div>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Import from URL
            </CardTitle>
            <CardDescription>
              Try extracting recipes from public recipe websites. Note: Video platforms often block automated extraction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Try: AllRecipes.com, FoodNetwork.com, or BBC Good Food"
                  className="pl-10"
                  disabled={isExtracting}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlExtract()}
                />
              </div>
              <Button
                type="button"
                onClick={handleUrlExtract}
                disabled={isExtracting || !urlInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Extract Recipe
                  </>
                )}
              </Button>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-emerald-600 font-bold">✅ NOW WORKS: YouTube · Instagram · TikTok (transcript + thumbnail)</p>
              <p className="text-xs text-emerald-600 font-medium">✓ AllRecipes, Food Network, BBC Good Food (full recipe extraction)</p>
              <p className="text-xs text-slate-500 italic">💡 Videos provide transcripts - you may need to manually organize ingredients</p>
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gradient-to-br from-slate-50 via-white to-slate-50 px-2 text-slate-500">Or enter manually</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-32">

          {showErrors && Object.keys(errors).length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">!</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-900 mb-2">Please fix the following errors:</h3>
                    <ul className="space-y-1">
                      {Object.values(errors).map((error, idx) => (
                        <li key={idx} className="text-sm text-red-700">• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>The essential details about your recipe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">Recipe Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Grandma's Chocolate Chip Cookies"
                  className={`mt-1.5 ${errors.title ? 'border-red-500' : ''}`}
                />
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
              </div>

              {imageUrl && (
                <div className="space-y-2">
                  <div className="relative w-48 h-48 mx-auto rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100">
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(imageUrl.replace(/&amp;/g, '&'))}`}
                      alt={title || 'Recipe'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('[AddRecipe] Image failed to load:', imageUrl);
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-64 flex flex-col items-center justify-center text-slate-500">
                              <svg class="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p class="text-sm font-medium">Image cannot be displayed</p>
                              <p class="text-xs">(Instagram images may not work)</p>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="prepTime" className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Prep Time (min) *
                  </Label>
                  <Input
                    id="prepTime"
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="15"
                    className={`mt-1.5 ${errors.prepTime ? 'border-red-500' : ''}`}
                  />
                  {errors.prepTime && <p className="text-sm text-red-500 mt-1">{errors.prepTime}</p>}
                </div>

                <div>
                  <Label htmlFor="cookTime" className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Cook Time (min) *
                  </Label>
                  <Input
                    id="cookTime"
                    type="number"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value)}
                    placeholder="30"
                    className={`mt-1.5 ${errors.cookTime ? 'border-red-500' : ''}`}
                  />
                  {errors.cookTime && <p className="text-sm text-red-500 mt-1">{errors.cookTime}</p>}
                </div>

                <div>
                  <Label htmlFor="servings" className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Servings *
                  </Label>
                  <Input
                    id="servings"
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="4"
                    className={`mt-1.5 ${errors.servings ? 'border-red-500' : ''}`}
                  />
                  {errors.servings && <p className="text-sm text-red-500 mt-1">{errors.servings}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cuisineType" className="text-sm font-medium">Cuisine Type *</Label>
                  <Select value={cuisineType} onValueChange={setCuisineType}>
                    <SelectTrigger className={`mt-1.5 ${errors.cuisineType ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUISINE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.cuisineType && <p className="text-sm text-red-500 mt-1">{errors.cuisineType}</p>}
                </div>

                <div>
                  <Label htmlFor="difficulty" className="text-sm font-medium flex items-center gap-2">
                    <ChefHat className="w-4 h-4" />
                    Difficulty *
                  </Label>
                  <Select value={difficulty} onValueChange={(val) => setDifficulty(val as 'Easy' | 'Medium' | 'Hard')}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="imageUrl" className="text-sm font-medium">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Meal Types *</CardTitle>
              <CardDescription>When is this recipe typically served?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={selectedMealTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleMealType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
              {errors.mealTypes && <p className="text-sm text-red-500 mt-2">{errors.mealTypes}</p>}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Dietary Tags</CardTitle>
              <CardDescription>Select any that apply to this recipe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedDietaryTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleDietaryTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Ingredients *</CardTitle>
              <CardDescription>List all ingredients (quantities optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="w-20">
                    <Input
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      placeholder="1"
                      className="text-center"
                    />
                  </div>
                  <div className="w-28">
                    <Select
                      value={ingredient.unit}
                      onValueChange={(val) => updateIngredient(index, 'unit', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      placeholder="Ingredient name"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    disabled={ingredients.length === 1}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {errors.ingredients && <p className="text-sm text-red-500">{errors.ingredients}</p>}
              <Button
                type="button"
                variant="outline"
                onClick={addIngredient}
                className="w-full mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Ingredient
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Instructions *</CardTitle>
              <CardDescription>Step-by-step cooking instructions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700 mt-1">
                    {index + 1}
                  </div>
                  <Textarea
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder="Describe this step..."
                    className="flex-1 min-h-[80px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInstruction(index)}
                    disabled={instructions.length === 1}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {errors.instructions && <p className="text-sm text-red-500">{errors.instructions}</p>}
              <Button
                type="button"
                variant="outline"
                onClick={addInstruction}
                className="w-full mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Any additional tips or variations</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any helpful notes, tips, or variations..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

        </form>

        <div className="fixed bottom-24 left-0 right-0 z-50 pointer-events-none">
          <div className="flex justify-center items-center gap-3 pointer-events-auto">
            {onNavigate && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate('my-recipes')}
                className="bg-white shadow-2xl border-2 border-gray-300 hover:bg-gray-50 px-6 py-6 text-base font-semibold rounded-full"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              onClick={handleSubmit}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-base font-semibold shadow-2xl rounded-full transition-all transform hover:scale-105"
            >
              Create Recipe
            </Button>
          </div>
        </div>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
  <DialogContent className="max-w-4xl max-h-[90vh]">
    <DialogHeader>
      <DialogTitle className="text-2xl flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-blue-600" />
        Review Extracted Recipe
      </DialogTitle>
      <DialogDescription>
        <p className="text-orange-600 font-medium">
          Double-check and edit as needed. Social Media recipes may have altered instructions.
        </p>
      </DialogDescription>
    </DialogHeader>
    {extractedData && (
      <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
        <div className="space-y-6 py-4">
                  {extractedData.imageUrl && (
                    <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100 mx-auto">
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(extractedData.imageUrl.replace(/&amp;/g, '&'))}`}
                        alt={extractedData.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('[Preview] Image failed to load:', extractedData.imageUrl);
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                <svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p class="text-xs font-medium">No image</p>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{extractedData.title}</h3>
                      {extractedData.description && (
                        <p className="text-sm text-slate-600 leading-relaxed">{extractedData.description}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-slate-600" />
                          <span className="text-xs font-medium text-slate-600">Prep Time</span>
                        </div>
                        <p className="text-lg font-bold text-slate-900">{extractedData.prepTime} min</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-slate-600" />
                          <span className="text-xs font-medium text-slate-600">Cook Time</span>
                        </div>
                        <p className="text-lg font-bold text-slate-900">{extractedData.cookTime} min</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-slate-600" />
                          <span className="text-xs font-medium text-slate-600">Servings</span>
                        </div>
                        <p className="text-lg font-bold text-slate-900">{extractedData.servings}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {extractedData.cuisineType}
                      </Badge>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        {extractedData.difficulty}
                      </Badge>
                      {extractedData.mealTypes.map(type => (
                        <Badge key={type} variant="outline">{type}</Badge>
                      ))}
                      {extractedData.dietaryTags.map(tag => (
                        <Badge key={tag} variant="outline" className="bg-amber-50 text-amber-700">{tag}</Badge>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Ingredients</h4>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <ul className="space-y-2">
                          {extractedData.ingredients.map((ingredient, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-slate-400 mt-0.5">•</span>
                              <span className="text-slate-700">
                                <span className="font-semibold">{ingredient.quantity} {ingredient.unit}</span> {ingredient.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Instructions</h4>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <ol className="space-y-3">
                          {extractedData.instructions.map((instruction, index) => (
                            <li key={index} className="flex gap-3 text-sm">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </span>
                              <span className="text-slate-700 pt-0.5">{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {extractedData.notes && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">Notes</h4>
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                          <p className="text-sm text-slate-700">{extractedData.notes}</p>
                        </div>
                      </div>
                    )}

                    {extractedData.sourceUrl && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Link2 className="w-3 h-3" />
                        <span>Source: {extractedData.sourceUrl}</span>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}

            <DialogFooter className="flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelExtraction}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAcceptExtraction}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Review and Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
