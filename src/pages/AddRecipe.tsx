import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Clock, Users, ChefHat, Link2, Sparkles, Loader2, Upload, Image as ImageIcon, Camera, FileText, Edit } from 'lucide-react';
import { useRecipes } from '@/context/RecipeContext';
import { Ingredient } from '@/types/recipe';
import { toast } from 'sonner';
import { extractRecipeFromUrl, extractRecipeFromPhoto, isValidUrl, type ExtractedRecipeData } from '@/services/recipeExtractor';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { downloadAndStoreImage } from '@/lib/imageStorage';
import { compressImage, formatFileSize, isImageFile } from '@/lib/imageCompression';


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
  const { dispatch, saveRecipe } = useRecipes();
  const [editRecipeId, setEditRecipeId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<File[]>([]);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [isExtractingFromDescription, setIsExtractingFromDescription] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'description' | 'photo' | 'manual'>('url');
  const hasRestoredFromSession = useRef(false);

  // Restore form data on mount FIRST (before checking for edit)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');

    if (editId) {
      console.log('[AddRecipe] Edit mode detected, skipping session restore');
      setEditRecipeId(editId);
      setIsEditMode(true);
      setActiveTab('manual');
      loadRecipeForEdit(editId);
      hasRestoredFromSession.current = true;
      return;
    }

    const savedData = sessionStorage.getItem('addRecipeFormData');
    if (savedData && !hasRestoredFromSession.current) {
      try {
        const data = JSON.parse(savedData);
        if (data.title || data.ingredients?.some((i: Ingredient) => i.name)) {
          setTitle(data.title || '');
          setIngredients(data.ingredients || [{ quantity: '', unit: 'cup', name: '' }]);
          setInstructions(data.instructions || ['']);
          setPrepTime(data.prepTime || '');
          setCookTime(data.cookTime || '');
          setServings(data.servings || '');
          setCuisineType(data.cuisineType || '');
          setDifficulty(data.difficulty || 'Easy');
          setSelectedMealTypes(data.selectedMealTypes || []);
          setSelectedDietaryTags(data.selectedDietaryTags || []);
          setImageUrl(data.imageUrl || '');
          setVideoUrl(data.videoUrl || '');
          setNotes(data.notes || '');
          setUrlInput(data.urlInput || '');
          setActiveTab(data.activeTab || 'url');
          console.log('[AddRecipe] ✅ Restored form data from session');
        }
      } catch (e) {
        console.error('Failed to restore form data:', e);
      }
    }

    // Mark as restored even if no data was found
    hasRestoredFromSession.current = true;
  }, []);

  const loadRecipeForEdit = async (recipeId: string) => {
    try {

      const { getRecipeById } = await import('@/services/recipeService');
      const recipe = await getRecipeById(recipeId);

      if (recipe) {
        setTitle(recipe.title);
        setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ quantity: '', unit: 'cup', name: '' }]);
        setInstructions(recipe.instructions.length > 0 ? recipe.instructions : ['']);
        setPrepTime(String(recipe.prepTime));
        setCookTime(String(recipe.cookTime));
        setServings(String(recipe.servings));
        setCuisineType(recipe.cuisineType);
        setDifficulty(recipe.difficulty);
        setSelectedMealTypes(recipe.mealType || []);
        setSelectedDietaryTags(recipe.dietaryTags || []);
        setImageUrl(recipe.imageUrl || '');
        setVideoUrl(recipe.videoUrl || '');
        setNotes(recipe.notes || '');
        toast.success('Recipe loaded for editing');
      } else {
        toast.error('Recipe not found');
        setIsEditMode(false);
        setEditRecipeId(null);
      }
    } catch (error) {
      console.error('Failed to load recipe:', error);
      toast.error('Failed to load recipe');
      setIsEditMode(false);
      setEditRecipeId(null);
    }
  };

  // Save form data to sessionStorage whenever it changes
  useEffect(() => {
    if (!isEditMode && hasRestoredFromSession.current) {
      const formData = {
        title,
        ingredients,
        instructions,
        prepTime,
        cookTime,
        servings,
        cuisineType,
        difficulty,
        selectedMealTypes,
        selectedDietaryTags,
        imageUrl,
        videoUrl,
        notes,
        urlInput,
        activeTab
      };
      sessionStorage.setItem('addRecipeFormData', JSON.stringify(formData));
    }
  }, [title, ingredients, instructions, prepTime, cookTime, servings, cuisineType, difficulty, selectedMealTypes, selectedDietaryTags, imageUrl, videoUrl, notes, urlInput, activeTab, isEditMode]);

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

    if (!isImageFile(file)) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading('Compressing image...', { duration: 0 });

    try {
      const originalSize = file.size;

      const result = await compressImage(file, (progress) => {
        if (progress.isCompressing) {
          toast.loading(
            `Compressing image... ${Math.round(progress.percent)}%`,
            { id: toastId, duration: 0 }
          );
        }
      });

      const compressedFile = result.file;
      const savedBytes = originalSize - result.compressedSize;
      const savedPercent = Math.round(((savedBytes) / originalSize) * 100);

      toast.loading('Uploading compressed image...', { id: toastId, duration: 0 });

      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to upload images', { id: toastId });
        return;
      }

      const fileExt = 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName);

      setUploadedImageFile(compressedFile);
      setUploadedImageUrl(publicUrl);
      setImageUrl('');

      toast.success(
        `Image uploaded! Reduced ${formatFileSize(originalSize)} → ${formatFileSize(result.compressedSize)} (${savedPercent}% smaller)`,
        { id: toastId, duration: 4000 }
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    if (files.length > 4) {
      toast.error('Maximum 4 photos allowed');
      return;
    }

    const invalidFiles = files.filter(f => !isImageFile(f));
    if (invalidFiles.length > 0) {
      toast.error('Please upload valid image files (JPG, PNG, WEBP)');
      return;
    }

    setSelectedPhotoFiles(files);

    const previews: string[] = [];
    let loaded = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push(e.target?.result as string);
        loaded++;
        if (loaded === files.length) {
          setPhotoPreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoScan = async () => {
    if (selectedPhotoFiles.length === 0) {
      toast.error('Please select photos first');
      return;
    }

    setIsScanningPhoto(true);

    try {
      const message = selectedPhotoFiles.length === 1
        ? 'Scanning recipe photo...'
        : `Scanning ${selectedPhotoFiles.length} photos and combining...`;

      toast.loading(message, { id: 'scan-photo' });
      const data = await extractRecipeFromPhoto(selectedPhotoFiles);

      const successMsg = selectedPhotoFiles.length === 1
        ? 'Recipe extracted from photo! Review and edit as needed.'
        : `Recipe extracted from ${selectedPhotoFiles.length} photos! Review and edit as needed.`;

      toast.success(successMsg, { id: 'scan-photo', duration: 2000 });

      setTitle(data.title.replace(/\s+on\s+instagram$/i, ''));

      const normalizedIngredients = data.ingredients.map(ing => ({
        quantity: ing.quantity || '',
        unit: ing.unit || 'cup',
        name: ing.name || ''
      }));

      setIngredients(normalizedIngredients);
      setInstructions(data.instructions);
      setPrepTime(String(parseTimeValue(data.prepTime)));
      setCookTime(String(parseTimeValue(data.cookTime)));
      setServings(String(parseServingsValue(data.servings)));
      setCuisineType(data.cuisineType);
      setDifficulty(data.difficulty);
      setSelectedMealTypes(data.mealTypes);
      setSelectedDietaryTags(data.dietaryTags);

      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      }

      setNotes(`Scanned from ${selectedPhotoFiles.length} photo${selectedPhotoFiles.length > 1 ? 's' : ''}\n\n${data.notes || ''}`);

      setActiveTab('manual');
      setSelectedPhotoFiles([]);
    } catch (error: any) {
      console.error('Photo scan error:', error);
      const errorMessage = error?.message || 'Failed to scan photo. Please try again.';
      toast.error(errorMessage, { id: 'scan-photo' });
      setPhotoPreviews([]);
      setSelectedPhotoFiles([]);
    } finally {
      setIsScanningPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDescriptionExtract = async () => {
    if (!descriptionInput.trim()) {
      toast.error('Please paste a video description');
      return;
    }

    setIsExtractingFromDescription(true);

    try {
      toast.loading('Extracting recipe from description...', { id: 'extract-desc' });

      const RENDER_SERVER = import.meta.env.VITE_API_URL || 'https://recipe-backend-nodejs-1.onrender.com';
      const response = await fetch(`${RENDER_SERVER}/extract-manual-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoTitle.trim() || 'Recipe from Video',
          description: descriptionInput.trim(),
          thumbnail: '',
          channelTitle: '',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Description Extract] Error:', errorText);
        throw new Error('Failed to scrape recipe from description');
      }

      const data = await response.json();

      // Convert to ExtractedRecipeData format
      const extractedRecipe: ExtractedRecipeData = {
        title: data.title || videoTitle.trim() || 'Recipe from Video',
        description: data.description || '',
        creator: data.creator || 'Unknown',
        ingredients: data.ingredients.map((ing: string) => {
          const parts = ing.split(' ');
          return {
            quantity: parts[0] || '',
            unit: parts[1] || 'piece',
            name: parts.slice(2).join(' ') || ing
          };
        }),
        instructions: data.instructions || [],
        prepTime: String(data.prep_time || 15),
        cookTime: String(data.cook_time || 30),
        servings: String(data.servings || 4),
        cuisineType: data.cuisineType || 'Global',
        difficulty: data.difficulty || 'Medium',
        mealTypes: ['Dinner'],
        dietaryTags: data.dietaryTags || [],
        imageUrl: data.image || data.imageUrl || '',
        videoUrl: '',
        notes: data.notes || 'Extracted from description',
        sourceUrl: '',
      };

      toast.success('Recipe extracted from description! Review and edit before saving.', { id: 'extract-desc', duration: 2000 });
      populateFormWithExtractedData(extractedRecipe, '');
      setIsExtractingFromDescription(false);

      // Clear the inputs
      setDescriptionInput('');
      setVideoTitle('');
    } catch (error: any) {
      console.error('[Description Extract] Error:', error);
      toast.error(error.message || 'Failed to scrape recipe from description.', { id: 'extract-desc' });
      setIsExtractingFromDescription(false);
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

      if (data.hasConflict) {
        setExtractedData(data);
        setShowConflictDialog(true);
        toast.warning('Multiple recipe versions found! Please choose which to use.', { id: 'extract', duration: 2000 });
      } else {
        const isSocialMedia = urlInput.includes('instagram.com') || urlInput.includes('tiktok.com');
        const hasNoIngredients = !data.ingredients || data.ingredients.length === 0;
        const hasNoInstructions = !data.instructions || data.instructions.length === 0;

        if (isSocialMedia && (hasNoIngredients || hasNoInstructions)) {
          toast.info('This post has limited recipe details. Switch to "Paste Video Description" tab and manually add the recipe ingredients and instructions you see in the video!', {
            id: 'extract',
            duration: 6000
          });
        } else {
          toast.success('Recipe extracted! Review and edit before saving.', { id: 'extract', duration: 2000 });
        }

        populateFormWithExtractedData(data, urlInput);
      }
      setIsExtracting(false);
    } catch (error: any) {
      if (error.message.includes('waking up')) {
        toast.info('Server starting up... retrying in 30 seconds', { id: 'extract', duration: 30000 });

        setTimeout(async () => {
          try {
            toast.loading('Retrying extraction...', { id: 'extract' });
            const data = await extractRecipeFromUrl(urlInput);

            const isSocialMedia = urlInput.includes('instagram.com') || urlInput.includes('tiktok.com');
            const hasNoIngredients = !data.ingredients || data.ingredients.length === 0;
            const hasNoInstructions = !data.instructions || data.instructions.length === 0;

            if (isSocialMedia && (hasNoIngredients || hasNoInstructions)) {
              toast.info('This post has limited recipe details. Switch to "Paste Video Description" tab and manually add the recipe ingredients and instructions you see in the video!', {
                id: 'extract',
                duration: 6000
              });
            } else {
              toast.success('Recipe extracted!', { id: 'extract', duration: 2000 });
            }

            populateFormWithExtractedData(data, urlInput);
          } catch (retryError: any) {
            toast.error(retryError.message || 'Extraction failed. Please try again.', { id: 'extract' });
          } finally {
            setIsExtracting(false);
          }
        }, 30000);
      } else {
        toast.error(error.message || 'Failed to scrape recipe.', { id: 'extract' });
        setIsExtracting(false);
      }
    }
  };

  const populateFormWithExtractedData = (data: ExtractedRecipeData, sourceUrl: string = '') => {
    setTitle(data.title.replace(/\s+on\s+instagram$/i, ''));

    const normalizedIngredients = data.ingredients.map(ing => ({
      quantity: ing.quantity || '',
      unit: ing.unit || 'cup',
      name: ing.name || ''
    }));

    setIngredients(normalizedIngredients);
    setInstructions(data.instructions);
    setPrepTime(String(parseTimeValue(data.prepTime)));
    setCookTime(String(parseTimeValue(data.cookTime)));
    setServings(String(parseServingsValue(data.servings)));
    setCuisineType(data.cuisineType);
    setDifficulty(data.difficulty);
    setSelectedMealTypes(data.mealTypes);
    setSelectedDietaryTags(data.dietaryTags);

    if (data.imageUrl) {
      setImageUrl(data.imageUrl);
    }

    // Don't set video URL for YouTube/Instagram/TikTok - videos won't play in social feed
    const isYouTubeOrSocial = sourceUrl && (
      sourceUrl.includes('youtube.com') ||
      sourceUrl.includes('youtu.be') ||
      sourceUrl.includes('instagram.com') ||
      sourceUrl.includes('tiktok.com')
    );

    if (!isYouTubeOrSocial && data.videoUrl) {
      setVideoUrl(data.videoUrl);
    } else {
      setVideoUrl('');
    }

    const sourceNote = sourceUrl ? `Source: ${sourceUrl}\n\n` : '';
    setNotes(sourceNote + (data.notes || ''));

    setActiveTab('manual');
  };

  const handleAcceptExtraction = () => {
    if (!extractedData) return;
    populateFormWithExtractedData(extractedData, urlInput);
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

    // Check if it's a base64 data URL that needs to be uploaded
    const isBase64Image = finalImageUrl && finalImageUrl.startsWith('data:image');

    // Check if it's an Instagram/external URL that needs to be stored permanently
   const needsDownload = finalImageUrl &&
                      !uploadedImageUrl &&
                      !isBase64Image &&
                      (finalImageUrl.includes('instagram.com') ||
                       finalImageUrl.includes('cdninstagram.com') ||
                       finalImageUrl.includes('fbcdn.net') ||
                       finalImageUrl.includes('tiktok') ||
                       finalImageUrl.includes('tiktokcdn'));

    try {
      // Show loading toast
      const loadingToastId = toast.loading(isEditMode ? 'Updating recipe...' : 'Creating recipe...');

      // 1. Create or update the recipe
      const { createRecipe, updateRecipe } = await import('@/services/recipeService');
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

      const createdRecipe = isEditMode && editRecipeId
        ? await updateRecipe(editRecipeId, tempRecipe)
        : await createRecipe(tempRecipe);

      console.log(`[AddRecipe] Recipe ${isEditMode ? 'updated' : 'created'} with ID:`, createdRecipe.id);

      // 2. If it's a base64 image from photo scan, upload it to storage
      if (isBase64Image && finalImageUrl) {
        try {
          toast.loading('Uploading scanned photo...', { id: loadingToastId });
          console.log('[AddRecipe] Uploading base64 image to storage');

          const { supabase } = await import('@/lib/supabase');

          // Convert base64 to blob
          const base64Response = await fetch(finalImageUrl);
          const blob = await base64Response.blob();

          // Generate unique filename
          const fileExt = blob.type.split('/')[1] || 'jpg';
          const fileName = `recipe-${createdRecipe.id}-${Date.now()}.${fileExt}`;
          const filePath = `recipes/${fileName}`;

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('recipe-images')
            .upload(filePath, blob, {
              contentType: blob.type,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('[AddRecipe] Storage upload failed:', uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('recipe-images')
            .getPublicUrl(filePath);

          const permanentUrl = urlData.publicUrl;
          console.log('[AddRecipe] Uploaded to storage:', permanentUrl);

          // Update recipe with permanent URL
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
        } catch (imageError) {
          console.error('[AddRecipe] Base64 image upload failed:', imageError);
          // Continue with base64 URL if upload fails (not ideal but better than nothing)
        }
      }

      // 3. If it's an Instagram URL, download and store it permanently
      if (needsDownload && finalImageUrl) {
        try {
          toast.loading('Downloading and storing image permanently...', { id: loadingToastId });
          console.log('[AddRecipe] Downloading Instagram image:', finalImageUrl);

          const permanentUrl = await downloadAndStoreImage(
            finalImageUrl,
            createdRecipe.id
          );

          console.log('[AddRecipe] Permanent URL:', permanentUrl);

          // 4. Update the recipe with the permanent URL
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

      // 5. Create social post
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
            toast.success(isEditMode ? 'Recipe updated successfully!' : 'Recipe created successfully!', { id: loadingToastId });
          } else {
            toast.success(isEditMode ? 'Recipe updated and posted to your profile!' : 'Recipe created and posted to your profile!', { id: loadingToastId });
          }
        } else {
          toast.success(isEditMode ? 'Recipe updated successfully!' : 'Recipe created successfully!', { id: loadingToastId });
        }
      } catch (postError) {
        console.error('[AddRecipe] Post creation error:', postError);
        toast.success(isEditMode ? 'Recipe updated successfully!' : 'Recipe created successfully!', { id: loadingToastId });
      }

      // 5. Add to saved recipes
      try {
        await saveRecipe(createdRecipe);
      } catch (saveError) {
        console.error('[AddRecipe] Failed to save recipe:', saveError);
      }

      // 6. Clear saved form data after successful submission
      sessionStorage.removeItem('addRecipeFormData');

      // 7. Navigate to my recipes
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
        className="absolute inset-x-0 bottom-0 md:relative md:inset-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 md:min-h-screen overflow-hidden md:overflow-visible rounded-t-3xl md:rounded-none shadow-2xl md:shadow-none pb-safe flex flex-col"
        style={{
          maxHeight: window.innerWidth >= 768 ? 'none' : '90vh'
        }}
      >
        {/* Grabber handle - mobile only */}
        <div className="flex md:hidden items-center justify-center pt-3 pb-2 bg-gradient-to-br from-blue-50 to-white">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

    {/* Title section - scrolls away naturally */}
        <div className="w-full bg-gradient-to-br from-blue-50 to-white border-b border-slate-200 py-4 md:py-6">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 text-center">Create New Recipe</h1>
            <p className="text-sm sm:text-base text-slate-600 text-center mt-1">See a recipe online you like, add it here!</p>
          </div>
        </div>

        {/* Scrollable content container */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-36 md:pb-24 pt-4">
          <div className="max-w-4xl mx-auto px-4 py-6 mb-4">

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-4 transition-all whitespace-nowrap ${
              activeTab === 'url'
                ? 'bg-blue-50 border-blue-500 font-bold text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Link2 className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Import From URL</span>
          </button>

          <button
            onClick={() => setActiveTab('description')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-4 transition-all whitespace-nowrap ${
              activeTab === 'description'
                ? 'bg-purple-50 border-purple-500 font-bold text-purple-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Paste Notes</span>
          </button>

          <button
            onClick={() => setActiveTab('photo')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-4 transition-all whitespace-nowrap ${
              activeTab === 'photo'
                ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Camera className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Upload Photo</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-4 transition-all whitespace-nowrap ${
              activeTab === 'manual'
                ? 'bg-slate-50 border-slate-500 font-bold text-slate-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Edit className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Input Manually</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'url' && (
        <Card className="border-2 border-blue-500 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="leading-tight">Import from URL</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 flex-shrink-0" />
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste recipe link..."
                className="pl-10 h-10 text-sm placeholder:text-slate-400 border-2 border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 shadow-sm"
                disabled={isExtracting}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlExtract()}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setUrlInput('');
                  toast.success('Cleared!');
                }}
                disabled={isExtracting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10"
              >
                Clear
              </Button>
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10"
              >
                Paste
              </Button>
            </div>

            <Button
              type="button"
              onClick={handleUrlExtract}
              disabled={isExtracting || !urlInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm">Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-sm">Scrape Recipe</span>
                </>
              )}
            </Button>

            {/* Instructions moved below the action buttons */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="space-y-2 text-xs leading-relaxed">
                {/* Underlined solid black INSTRUCTIONS */}
                <p className="font-bold text-black pb-0.5 border-b-2 border-black inline-block">
                  INSTRUCTIONS
                </p>

                {/* Numbered steps */}
                <ol className="space-y-1.5 text-black ml-0.5">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black-600 min-w-[14px]">1.</span>
                    <span>
                      <span className="font-bold text-black">COPY</span> a link from online/social media &amp;{' '}
                      <span className="font-bold text-black">PASTE</span> above
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black-600 min-w-[14px]">2.</span>
                    <span>Click <span className="font-bold text-blue-600">"Scrape Recipe"</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black-600 min-w-[14px]">3.</span>
                    <span>Update as needed — AI does its best, some recipes may need manual editing</span>
                  </li>
                </ol>
                <div className="mt-3 pt-2 border-t border-slate-200 space-y-1 text-xs">
  <p className="text-blue-600 font-semibold">✅ Supported: All recipe websites & most blogs</p>
  <p className="text-blue-600 font-semibold">✅ Supported: YouTube videos (with description fallback)</p>
  <p className="text-orange-600">⚠️ Warning: Instagram & TikTok (may take 30–60 seconds)</p>
  <p className="text-purple-600 font-medium">💡 YouTube blocked? Use "Paste Video Description" </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Manual Description Paste Tab */}
        {activeTab === 'description' && (
        <Card className="border-2 border-purple-500 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <span className="leading-tight">Paste Video Description</span>
              <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700 border-purple-200">
                For YouTube
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              If automatic extraction fails, copy the video description from YouTube and paste it here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="video-title" className="text-xs font-medium text-slate-700">
                Video Title (Optional)
              </Label>
              <Input
                id="video-title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g., Best Chocolate Cake Recipe"
                className="mt-1 h-10 text-sm border-purple-200 focus:border-purple-500"
                disabled={isExtractingFromDescription}
              />
            </div>

            <div>
              <Label htmlFor="description-input" className="text-xs font-medium text-slate-700">
                Video Description *
              </Label>
              <Textarea
                id="description-input"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder="Paste the full video description here, including ingredients and instructions..."
                className="mt-1 min-h-[200px] text-sm border-purple-200 focus:border-purple-500 font-mono"
                disabled={isExtractingFromDescription}
              />
              <p className="text-xs text-slate-500 mt-1">
                Paste the complete description from the video (click "...more" on YouTube to see full description)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setDescriptionInput('');
                  setVideoTitle('');
                  toast.success('Cleared!');
                }}
                disabled={isExtractingFromDescription}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-10"
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setDescriptionInput(text);
                    toast.success('Pasted!');
                  } catch (err) {
                    toast.error('Failed to paste. Copy text first.');
                  }
                }}
                disabled={isExtractingFromDescription}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-10"
              >
                Paste
              </Button>
            </div>

            <Button
              type="button"
              onClick={handleDescriptionExtract}
              disabled={isExtractingFromDescription || !descriptionInput.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white h-10"
            >
              {isExtractingFromDescription ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm">Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-sm">Scrape Recipe</span>
                </>
              )}
            </Button>

            <div className="mt-4 pt-4 border-t border-purple-200">
              <div className="space-y-2 text-xs leading-relaxed">
                <p className="font-bold text-black pb-0.5 border-b-2 border-black inline-block">
                  WHEN TO USE THIS
                </p>
                <ol className="space-y-1.5 text-black ml-0.5">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black-600 min-w-[14px]">•</span>
                    <span>YouTube video extraction shows bot detection error</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black-600 min-w-[14px]">•</span>
                    <span>Recipe is in the video description but not extracting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black-600 min-w-[14px]">•</span>
                    <span>You want faster extraction without waiting for audio processing</span>
                  </li>
                </ol>
                <div className="mt-2 p-2 bg-purple-100 border border-purple-200 rounded text-xs">
                  <p className="font-semibold text-purple-900">💡 Pro Tip:</p>
                  <p className="text-purple-800 mt-1">
                    On YouTube, click the "...more" button below the video to expand the full description, then copy everything and paste it here.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Photo Scan Tab */}
        {activeTab === 'photo' && (
        <Card className="border-2 border-emerald-500 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="leading-tight">Scan Recipe Photo</span>
              <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">
                ✨ NEW!
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border-2 border-emerald-200">
                    <img src={preview} alt={`Recipe photo ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      disabled={isScanningPhoto}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photoPreviews.length > 0 && (
              <p className="text-sm text-center text-emerald-700 font-medium">
                {photoPreviews.length} photo{photoPreviews.length > 1 ? 's' : ''} selected • {4 - photoPreviews.length} more allowed
              </p>
            )}

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              disabled={isScanningPhoto}
              className="hidden"
              id="photo-upload"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => document.getElementById('photo-upload')?.click()}
                disabled={isScanningPhoto || photoPreviews.length >= 4}
                variant="outline"
                className="flex-1 h-12 border-emerald-300"
              >
                <Upload className="w-5 h-5 mr-2" />
                {photoPreviews.length > 0 ? 'Add More' : 'Select Photos'}
              </Button>

              {photoPreviews.length > 0 && (
                <Button
                  type="button"
                  onClick={handlePhotoScan}
                  disabled={isScanningPhoto}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12"
                >
                  {isScanningPhoto ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Scan Recipe
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-emerald-200">
              <div className="space-y-2 text-xs leading-relaxed">
                <p className="font-bold text-black pb-0.5 border-b-2 border-black inline-block">
                  WHAT YOU CAN SCAN
                </p>

                <ol className="space-y-1.5 text-black ml-0.5">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 min-w-[14px]">•</span>
                    <span>Recipe cards (printed or handwritten)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 min-w-[14px]">•</span>
                    <span>Cookbook pages (upload multiple if recipe spans pages)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 min-w-[14px]">•</span>
                    <span>Handwritten recipes from grandma</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 min-w-[14px]">•</span>
                    <span>Screenshots of recipes</span>
                  </li>
                </ol>

                <div className="mt-3 pt-2 border-t border-emerald-200 space-y-1 text-xs">
                  <p className="text-emerald-600 font-semibold">✨ Upload up to 4 photos - AI combines them into one recipe</p>
                  <p className="text-slate-500">Photos are compressed automatically • Works best with clear, well-lit images</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

          {/* Manual Input Tab */}
          {activeTab === 'manual' && (
          <form onSubmit={handleSubmit} className="space-y-4 pb-24 lg:pb-6">
          {/* Basic Information */}
          <Card className="border-2 border-slate-500 shadow-sm bg-gradient-to-br from-slate-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Add Manually</CardTitle>
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
                    <SelectContent className="z-[300]">
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

          </form>
          )}

        {/* RECIPE ACTION BUTTONS - Fixed footer on mobile (above nav), sticky on desktop */}
        <div className="fixed bottom-[80px] lg:sticky lg:bottom-0 left-0 right-0 z-[150] lg:z-10 pointer-events-none">
          <div className="max-w-4xl mx-auto px-4 py-3 flex justify-center items-center gap-3 pointer-events-auto">
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
              {isEditMode ? 'Update Recipe' : 'Create Recipe'}
            </Button>
        </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
