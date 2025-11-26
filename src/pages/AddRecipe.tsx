import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Clock, Users, ChefHat, Link2, Sparkles, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { useRecipes } from '@/context/RecipeContext';
import { Ingredient } from '@/types/recipe';
import { toast } from 'sonner';
import { extractRecipeFromUrl, isValidUrl, type ExtractedRecipeData } from '@/services/recipeExtractor';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { downloadAndStoreImage } from '@/lib/imageStorage'; // ← NEW IMPORT


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
  'cup', 'TBSP', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l',
  'piece(s)', 'whole', 'pinch', 'dash', 'egg(s)', 'to taste'
];

const CUISINE_TYPES = [
  'American', 'Chinese', 'Culinary/Baked Goods', 'French', 'Healing/Medicine', 'Indian', 'Italian', 'Juices/Smoothies', 
  'Japanese', 'Korean', 'Mediterranean', 'Mexican/Spanish', 'Other', 'Pet Meals', 'Supplements',
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
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to upload images');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName);

      setUploadedImageFile(file);
      setUploadedImageUrl(publicUrl);
      setImageUrl('');
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
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
      toast.error('Please paste a recipe page URL, not a direct image link.');
      return;
    }

    setIsExtracting(true);

    try {
      toast.loading('Extracting recipe...', { id: 'extract' });
      const data = await extractRecipeFromUrl(urlInput);
      setExtractedData(data);

      if (data.hasConflict) {
        setShowConflictDialog(true);
        toast.warning('Multiple recipe versions found! Please choose which to use.', { id: 'extract' });
      } else {
        setShowPreview(true);
        toast.success('Recipe extracted! Review and edit before saving.', { id: 'extract' });
      }
      setIsExtracting(false);
    } catch (error: any) {
      if (error.message.includes('waking up')) {
        toast.info('Server starting up... retrying in 30 seconds', { id: 'extract', duration: 30000 });
        
        setTimeout(async () => {
          try {
            toast.loading('Retrying extraction...', { id: 'extract' });
            const data = await extractRecipeFromUrl(urlInput);
            setExtractedData(data);
            setShowPreview(true);
            toast.success('Recipe extracted!', { id: 'extract' });
          } catch (retryError: any) {
            toast.error(retryError.message || 'Extraction failed. Please try again.', { id: 'extract' });
          } finally {
            setIsExtracting(false);
          }
        }, 30000);
      } else {
        toast.error(error.message || 'Failed to extract recipe.', { id: 'extract' });
        setIsExtracting(false);
      }
    }
  };

  const handleAcceptExtraction = () => {
    if (!extractedData) return;

    setTitle(extractedData.title.replace(/\s+on\s+instagram$/i, ''));

    const normalizedIngredients = extractedData.ingredients.map(ing => ({
      quantity: ing.quantity || '',
      unit: ing.unit || 'cup',
      name: ing.name || ''
    }));

    setIngredients(normalizedIngredients);
    setInstructions(extractedData.instructions);
    setPrepTime(String(parseTimeValue(extractedData.prepTime)));
    setCookTime(String(parseTimeValue(extractedData.cookTime)));
    setServings(String(parseServingsValue(extractedData.servings)));
    setCuisineType(extractedData.cuisineType);
    setDifficulty(extractedData.difficulty);
    setSelectedMealTypes(extractedData.mealTypes);
    setSelectedDietaryTags(extractedData.dietaryTags);
    
    if (extractedData.imageUrl) {
      setImageUrl(extractedData.imageUrl);
    }
    
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

    const validIngredients = ingredients.filter(ing => ing.name.trim());
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

  // ============================================
  // UPDATED handleSubmit - WITH PERMANENT IMAGE STORAGE
  // ============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    if (!validate()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.name.trim());
    const validInstructions = instructions.filter(inst => inst.trim());

    // Determine the initial image URL
    let finalImageUrl = uploadedImageUrl || imageUrl.trim() || undefined;
    let postImageUrl = null;

    // Check if it's an Instagram/external URL that needs to be stored permanently
   const needsDownload = finalImageUrl && 
                      !uploadedImageUrl && 
                      (finalImageUrl.includes('instagram.com') || 
                       finalImageUrl.includes('cdninstagram.com') ||
                       finalImageUrl.includes('fbcdn.net') ||
                       finalImageUrl.includes('tiktok') ||
                       finalImageUrl.includes('tiktokcdn'));

    try {
      // Show loading toast
      const loadingToastId = toast.loading('Creating recipe...');

      // 1. First, create the recipe to get an ID
      const { createRecipe } = await import('@/services/recipeService');
      const tempRecipe = {
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
        imageUrl: finalImageUrl, // Temporary URL for now
        videoUrl: videoUrl.trim() || undefined,
        sourceUrl: urlInput.trim() || undefined,
        notes: notes.trim() || undefined,
        isSaved: true
      };

      const createdRecipe = await createRecipe(tempRecipe);
      console.log('[AddRecipe] Recipe created with ID:', createdRecipe.id);

      // 2. If it's an Instagram URL, download and store it permanently
      if (needsDownload && finalImageUrl) {
        try {
          toast.loading('Downloading and storing image permanently...', { id: loadingToastId });
          console.log('[AddRecipe] Downloading Instagram image:', finalImageUrl);

          const permanentUrl = await downloadAndStoreImage(
            finalImageUrl,
            createdRecipe.id
          );

          console.log('[AddRecipe] Permanent URL:', permanentUrl);

          // 3. Update the recipe with the permanent URL
          if (permanentUrl !== finalImageUrl) {
            const { supabase } = await import('@/lib/supabase');
            const { error: updateError } = await supabase
              .from('public_recipes')
              .update({ image_url: permanentUrl })
              .eq('id', createdRecipe.id);

            if (updateError) {
              console.error('[AddRecipe] Failed to update with permanent URL:', updateError);
            } else {
              console.log('[AddRecipe] ✅ Updated recipe with permanent URL');
              finalImageUrl = permanentUrl;
              postImageUrl = permanentUrl;
            }
          }
        } catch (imageError) {
          console.error('[AddRecipe] Image storage failed, using original URL:', imageError);
          // Continue with original URL if download fails
        }
      }

      // 4. Create social post
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Use permanent URL if we got one, otherwise use finalImageUrl (which includes imgur, etc)
          const finalPostImageUrl = postImageUrl || uploadedImageUrl || finalImageUrl || null;

          console.log('[AddRecipe] Creating post with image URL:', finalPostImageUrl);

          const { error: postError } = await supabase.from('posts').insert({
            user_id: user.id,
            title: title.trim(),
            image_url: finalPostImageUrl,
            video_url: videoUrl.trim() || null,
            caption: notes.trim() || 'Check out my recipe!',
            recipe_url: videoUrl.trim() || urlInput.trim() || null,
            recipe_id: createdRecipe.id,
          });

          if (postError) {
            console.error('[AddRecipe] Post creation failed:', postError);
            toast.success('Recipe created successfully!', { id: loadingToastId });
          } else {
            toast.success('Recipe created and posted to your profile!', { id: loadingToastId });
          }
        } else {
          toast.success('Recipe created successfully!', { id: loadingToastId });
        }
      } catch (postError) {
        console.error('[AddRecipe] Post creation error:', postError);
        toast.success('Recipe created successfully!', { id: loadingToastId });
      }

      // 5. Add to local state
      dispatch({ type: 'SAVE_RECIPE', payload: createdRecipe });

      // 6. Navigate to my recipes
      if (onNavigate) {
        onNavigate('my-recipes');
      }
    } catch (error: any) {
      console.error('[AddRecipe] Recipe creation failed:', error);
      const errorMessage = error?.message || 'Failed to create recipe. Please try again.';
      toast.error(errorMessage);
    }
  };

return (
    <div className="fixed inset-0 z-50 bg-black/50 md:bg-transparent md:relative">
      <div
        className="absolute inset-x-0 bottom-0 md:relative md:inset-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 md:min-h-screen overflow-hidden md:overflow-visible rounded-t-3xl md:rounded-none shadow-2xl md:shadow-none pb-safe"
        style={{
          maxHeight: window.innerWidth >= 768 ? 'none' : '90vh'
        }}
      >
        {/* Grabber handle - mobile only */}
        <div className="flex md:hidden items-center justify-center pt-3 pb-2 bg-gradient-to-br from-blue-50 to-white">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Title section - sticky on desktop */}
        <div className="w-full bg-gradient-to-br from-blue-50 to-white border-b border-slate-200 py-4 md:py-6 sticky top-14 z-[60]">


          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 text-center">Create New Recipe</h1>
            <p className="text-sm sm:text-base text-slate-600 text-center mt-1">See a recipe online you like, add it here!</p>
          </div>
        </div>

        {/* Scrollable content container */}
       <div className="overflow-y-auto max-h-[calc(90vh-8rem)] md:overflow-visible md:max-h-none overscroll-contain pb-[180px] md:pb-6">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* URL Import Section - Mobile optimized */}
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="leading-tight">Import from URL</span>
            </CardTitle>
           <CardDescription className="text-xs leading-relaxed">
  <div className="mt-2 space-y-2">
    {/* Underlined solid black INSTRUCTIONS */}
    <p className="font-bold text-black pb-0.5 border-b-2 border-black inline-block">
      INSTRUCTIONS
    </p>

    {/* Numbered steps — same tiny font, each on its own line */}
    <ol className="space-y-1.5 text-black ml-0.5">
      <li className="flex items-start gap-2">
        <span className="font-bold text-black-600 min-w-[14px]">1.</span>
       <span>
  <span className="font-bold text-black">COPY</span> a link from online/social media &amp;{' '}
  <span className="font-bold text-black">PASTE</span> below
</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="font-bold text-black-600 min-w-[14px]">2.</span>
        <span>Click <span className="font-bold text-blue-600">“Extract Recipe”</span></span>
      </li>
      <li className="flex items-start gap-2">
        <span className="font-bold text-black-600 min-w-[14px]">3.</span>
        <span>Update as needed — AI does its best, some recipes may need manual editing</span>
      </li>
    </ol>
    <div className="mt-3 pt-2 border-t border-slate-200 space-y-1 text-xs">
  <p className="text-emerald-600 font-semibold">Supported: All recipe websites & most blogs</p>
  <p className="text-orange-600">Warning: Instagram & TikTok (may take 30–60 seconds)</p>
  <p className="text-slate-500">Coming Soon: YouTube videos</p>
</div>
  </div>
</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
           <div className="flex gap-2">
  <div className="relative flex-1">
    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 flex-shrink-0" />
   <Input
  value={urlInput}
  onChange={(e) => setUrlInput(e.target.value)}
  placeholder="Paste recipe link..."
  className="pl-10 h-10 text-sm placeholder:text-slate-400"
  disabled={isExtracting}
  onKeyDown={(e) => e.key === 'Enter' && handleUrlExtract()}
/>
  </div>
  <Button
    type="button"
    onClick={async () => {
      try {
        const text = await navigator.clipboard.readText();
        setUrlInput(text);
        toast.success('Pasted!');
      } catch (err) {
        toast.error('Failed to paste. Copy a URL first.');
      }
    }}
    disabled={isExtracting}
    variant="outline"
    className="h-10"
  >
    Paste
  </Button>
</div>


            
            <Button
              type="button"
              onClick={handleUrlExtract}
              disabled={isExtracting || !urlInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Extract Recipe
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gradient-to-br from-slate-50 via-white to-slate-50 px-3 py-1 text-slate-500">Or enter manually</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Summary */}
          {showErrors && Object.keys(errors).length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-sm font-bold">!</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-red-900 mb-2">Please fix these errors:</h3>
                    <ul className="space-y-1">
                      {Object.values(errors).map((error, idx) => (
                        <li key={idx} className="text-sm text-red-700 break-words">• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription className="text-xs">Review extracted info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">Recipe Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex. Chocolate Chip Cookies"
                  className={`mt-1.5 text-base ${errors.title ? 'border-red-500' : ''}`}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              {/* Image Preview - Mobile optimized */}
              {(uploadedImageUrl || imageUrl) && (
                <div className="space-y-2">
                  <div className="relative w-full max-w-xs mx-auto aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100">
                    <img
                      src={uploadedImageUrl || imageUrl}
                      alt={title || 'Recipe'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                              <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p class="text-xs font-medium">Image unavailable</p>
                              <p class="text-xs text-slate-400">(Instagram images may not work)</p>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                  {uploadedImageUrl && (
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedImageFile(null);
                          setUploadedImageUrl('');
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Remove image
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Time and Servings - Mobile grid */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="prepTime" className="text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Prep (min) *
                  </Label>
                  <Input
                    id="prepTime"
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="15"
                    className={`mt-1 text-base ${errors.prepTime ? 'border-red-500' : ''}`}
                  />
                </div>

                <div>
                  <Label htmlFor="cookTime" className="text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Cook (min) *
                  </Label>
                  <Input
                    id="cookTime"
                    type="number"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value)}
                    placeholder="30"
                    className={`mt-1 text-base ${errors.cookTime ? 'border-red-500' : ''}`}
                  />
                </div>

                <div>
                  <Label htmlFor="servings" className="text-xs font-medium flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Servings *
                  </Label>
                  <Input
                    id="servings"
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="4"
                    className={`mt-1 text-base ${errors.servings ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>

              {/* Cuisine and Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* Image Upload Section - Mobile friendly */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Recipe Image
                  </Label>
                  <p className="text-xs text-slate-500 mt-1 mb-2">Upload or paste URL</p>

                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('imageUpload')?.click()}
                    disabled={isUploadingImage}
                    className="w-full h-12"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>

                  {uploadedImageFile && (
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 truncate">
                      <ImageIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{uploadedImageFile.name}</span>
                    </p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">or</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="imageUrl" className="text-sm font-medium">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setUploadedImageFile(null);
                      setUploadedImageUrl('');
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1.5 text-base"
                    disabled={!!uploadedImageFile}
                  />
                  {uploadedImageFile && (
                    <p className="text-xs text-slate-500 mt-1">Clear uploaded image to use URL</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meal Types */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Meal Types *</CardTitle>
              <CardDescription className="text-xs">When is this served?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={selectedMealTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105 text-sm py-1.5 px-3"
                    onClick={() => toggleMealType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
              {errors.mealTypes && <p className="text-xs text-red-500 mt-2">{errors.mealTypes}</p>}
            </CardContent>
          </Card>

          {/* Dietary Tags */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Dietary Tags</CardTitle>
              <CardDescription className="text-xs">Select any that apply</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedDietaryTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105 text-sm py-1.5 px-3"
                    onClick={() => toggleDietaryTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ingredients - Mobile optimized */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ingredients *</CardTitle>
              <CardDescription className="text-xs">List all ingredients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      placeholder="1"
                      className="w-16 text-center text-base"
                    />
                    <Select
                      value={ingredient.unit}
                      onValueChange={(val) => updateIngredient(index, 'unit', val)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <Input
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    placeholder="Ingredient name"
                    className="text-base"
                  />
                </div>
              ))}
              {errors.ingredients && <p className="text-xs text-red-500">{errors.ingredients}</p>}
              <Button
                type="button"
                variant="outline"
                onClick={addIngredient}
                className="w-full mt-2 h-11"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Ingredient
              </Button>
            </CardContent>
          </Card>

          {/* Instructions - Mobile optimized */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Instructions *</CardTitle>
              <CardDescription className="text-xs">Step-by-step instructions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700 mt-2">
                    {index + 1}
                  </div>
                  <Textarea
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder="Describe this step..."
                    className="flex-1 min-h-[100px] text-base"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInstruction(index)}
                    disabled={instructions.length === 1}
                    className="shrink-0 mt-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {errors.instructions && <p className="text-xs text-red-500">{errors.instructions}</p>}
              <Button
                type="button"
                variant="outline"
                onClick={addInstruction}
                className="w-full mt-2 h-11"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </CardContent>
          </Card>

          {/* Notes */}
         {/* Notes */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notes</CardTitle>
              <CardDescription className="text-xs">Tips or variations</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any helpful notes..."
                className="min-h-[120px] text-base"
              />
            </CardContent>
          </Card>
        </form>  {/* ← ADD THIS CLOSING FORM TAG HERE */}
         

        {/* Preview Dialog - Mobile optimized */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-4 pb-3 border-b">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="leading-tight">Review Recipe</span>
              </DialogTitle>
         ]
            </DialogHeader>

            {extractedData && (
              <ScrollArea className="max-h-[calc(90vh-180px)]">
                <div className="space-y-4 p-4">
                  {extractedData.imageUrl && (
                    <div className="relative w-full max-w-xs mx-auto aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100">
                      <img
                        src={extractedData.imageUrl}
                        alt={extractedData.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4">
                                <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p class="text-xs">No image</p>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{extractedData.title}</h3>
                      {extractedData.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{extractedData.description}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Clock className="w-3 h-3 text-slate-600" />
                          <span className="text-xs font-medium text-slate-600">Prep</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{extractedData.prepTime} min</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Clock className="w-3 h-3 text-slate-600" />
                          <span className="text-xs font-medium text-slate-600">Cook</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{extractedData.cookTime} min</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Users className="w-3 h-3 text-slate-600" />
                          <span className="text-xs font-medium text-slate-600">Serves</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{extractedData.servings}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                        {extractedData.cuisineType}
                      </Badge>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                        {extractedData.difficulty}
                      </Badge>
                      {extractedData.mealTypes.map(type => (
                        <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                      ))}
                      {extractedData.dietaryTags.map(tag => (
                        <Badge key={tag} variant="outline" className="bg-amber-50 text-amber-700 text-xs">{tag}</Badge>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2 text-sm">Ingredients</h4>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <ul className="space-y-1.5">
                          {extractedData.ingredients.map((ingredient, index) => (
                            <li key={index} className="flex items-start gap-2 text-xs">
                              <span className="text-slate-400 mt-0.5 flex-shrink-0">•</span>
                              <span className="text-slate-700 break-words">
                                <span className="font-semibold">{ingredient.quantity} {ingredient.unit}</span> {ingredient.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2 text-sm">Instructions</h4>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <ol className="space-y-2">
                          {extractedData.instructions.map((instruction, index) => (
                            <li key={index} className="flex gap-2 text-xs">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </span>
                              <span className="text-slate-700 pt-0.5 break-words">{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {extractedData.notes && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1.5 text-sm">Notes</h4>
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                          <p className="text-xs text-slate-700 break-words">{extractedData.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}

          <DialogFooter className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:p-6 flex flex-col sm:flex-row justify-center items-center gap-3 shadow-2xl z-50">
  <div className="w-full max-w-md flex flex-col sm:flex-row gap-3">
    <Button
      type="button"
      variant="outline"
      onClick={handleCancelExtraction}
      className="w-full sm:w-auto px-8 h-12 sm:h-14 text-base font-semibold rounded-full border-2 hover:bg-gray-50 active:scale-95 transition-transform"
    >
      Cancel
    </Button>
    <Button
      type="button"
      onClick={handleAcceptExtraction}
      className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-12 h-12 sm:h-14 text-base font-semibold rounded-full shadow-lg active:scale-95 transition-transform"
    >
      Use This Recipe
    </Button>
  </div>
</DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Conflict Dialog - Mobile optimized */}
        <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] p-0">
            <DialogHeader className="p-4 pb-3 border-b">
              <DialogTitle className="text-lg leading-tight">Multiple Versions Found</DialogTitle>
              <DialogDescription className="text-xs">
                Choose which version to use:
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[60vh] p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {extractedData?.structuredVersion && (
                  <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => {
                    if (extractedData.structuredVersion) {
                      setExtractedData(extractedData.structuredVersion);
                      setShowConflictDialog(false);
                      setShowPreview(true);
                      toast.success('Using recipe card version');
                    }
                  }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Recipe Card</CardTitle>
                      <CardDescription className="text-xs">From structured data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <Badge variant="secondary">{extractedData.structuredVersion.servings} servings</Badge>
                        <Badge variant="secondary">{extractedData.structuredVersion.prepTime}min</Badge>
                        <Badge variant="secondary">{extractedData.structuredVersion.cookTime}min</Badge>
                      </div>
                      <div>
                        <p className="font-semibold text-xs mb-1.5">Ingredients ({extractedData.structuredVersion.ingredients.length}):</p>
                        <ul className="space-y-1 text-xs text-slate-600 max-h-32 overflow-y-auto">
                          {extractedData.structuredVersion.ingredients.slice(0, 6).map((ing: Ingredient, idx: number) => (
                            <li key={idx} className="break-words">• {ing.quantity} {ing.unit} {ing.name}</li>
                          ))}
                          {extractedData.structuredVersion.ingredients.length > 6 && (
                            <li className="text-slate-400">+ {extractedData.structuredVersion.ingredients.length - 6} more...</li>
                          )}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {extractedData?.aiVersion && (
                  <Card className="cursor-pointer hover:border-green-500 transition-colors" onClick={() => {
                    if (extractedData.aiVersion) {
                      setExtractedData(extractedData.aiVersion);
                      setShowConflictDialog(false);
                      setShowPreview(true);
                      toast.success('Using blog content version');
                    }
                  }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Blog Content</CardTitle>
                      <CardDescription className="text-xs">From blog post</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <Badge variant="secondary">{extractedData.aiVersion.servings} servings</Badge>
                        <Badge variant="secondary">{extractedData.aiVersion.prepTime}min</Badge>
                        <Badge variant="secondary">{extractedData.aiVersion.cookTime}min</Badge>
                      </div>
                      <div>
                        <p className="font-semibold text-xs mb-1.5">Ingredients ({extractedData.aiVersion.ingredients.length}):</p>
                        <ul className="space-y-1 text-xs text-slate-600 max-h-32 overflow-y-auto">
                          {extractedData.aiVersion.ingredients.slice(0, 6).map((ing: Ingredient, idx: number) => (
                            <li key={idx} className="break-words">• {ing.quantity} {ing.unit} {ing.name}</li>
                          ))}
                          {extractedData.aiVersion.ingredients.length > 6 && (
                            <li className="text-slate-400">+ {extractedData.aiVersion.ingredients.length - 6} more...</li>
                          )}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-4 border-t">
              <Button variant="outline" onClick={() => setShowConflictDialog(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
            </DialogFooter>
</DialogContent>
        </Dialog>
          </div>
        </div>

        {/* RECIPE ACTION BUTTONS - Fixed above nav icons, z-[70] */}
        <div className="fixed bottom-[80px] left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-[70] lg:hidden">
          <div className="max-w-4xl mx-auto px-4 py-3 flex justify-center items-center gap-3">
            {onNavigate && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate('my-recipes')}
                className="bg-white shadow-md border-2 border-gray-300 hover:bg-gray-50 px-6 h-12 text-base font-semibold rounded-full"
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const form = document.querySelector('form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 h-12 text-base font-semibold shadow-lg rounded-full transition-all transform active:scale-95"
            >
              Create Recipe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}