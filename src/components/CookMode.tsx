import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Recipe } from '../types/recipe';

import {
  ChevronLeft,
  ChevronRight,
  X,
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Circle,
  Volume2,
  VolumeX,
  Users,
  Plus,
  Minus,
  Mic,
  MicOff,
} from 'lucide-react';

interface CookModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export function CookMode({ recipe, onClose }: CookModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [checkedSteps, setCheckedSteps] = useState(new Set());
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [servings, setServings] = useState(recipe.servings || 4);
  const [isMetric, setIsMetric] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const steps = recipe.steps && recipe.steps.length > 0
    ? recipe.steps
    : recipe.instructions.map((instruction, index) => ({
        stepNumber: index + 1,
        instruction,
        technique: '',
        duration: undefined,
      }));

  // Timer effect
  useEffect(() => {
    if (timerActive && !timerPaused && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            setTimerPaused(false);
            if (soundEnabled) {
              playTimerSound();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerActive, timerPaused, timeRemaining, soundEnabled]);

  const playTimerSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentStep < steps.length - 1) {
        handleNextStep();
      } else if (diff < 0 && currentStep > 0) {
        handlePrevStep();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      resetTimer();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      resetTimer();
    }
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimerPaused(false);
    setTimeRemaining(0);
  };

  const startTimer = () => {
    const step = steps[currentStep];
    if (step?.duration) {
      const timeMatch = step.duration.match(/(\d+)/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1]);
        setTimeRemaining(minutes * 60);
        setTimerActive(true);
        setTimerPaused(false);
      }
    }
  };

  const toggleTimer = () => {
    if (timerActive) {
      setTimerPaused(!timerPaused);
    } else {
      startTimer();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleIngredient = (index) => {
    setCheckedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleStep = (index) => {
    setCheckedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getIngredientEmoji = (ingredientName) => {
    const name = ingredientName.toLowerCase();

    // Comprehensive emoji mapping
    if (name.includes('salt')) return '🧂';
    if (name.includes('pepper')) return '🌶️';
    if (name.includes('water')) return '💧';
    if (name.includes('oil') || name.includes('olive')) return '🫒';
    if (name.includes('vinegar')) return '🍾';
    if (name.includes('soy sauce') || name.includes('sauce')) return '🥫';
    if (name.includes('honey')) return '🍯';
    if (name.includes('garlic') || name.includes('clove')) return '🧄';
    if (name.includes('ginger')) return '🫚';
    if (name.includes('onion')) return '🧅';
    if (name.includes('tomato')) return '🍅';
    if (name.includes('lemon') || name.includes('lime')) return '🍋';
    if (name.includes('orange')) return '🍊';
    if (name.includes('apple')) return '🍎';
    if (name.includes('banana')) return '🍌';
    if (name.includes('strawberry') || name.includes('berry')) return '🍓';
    if (name.includes('carrot')) return '🥕';
    if (name.includes('potato')) return '🥔';
    if (name.includes('broccoli')) return '🥦';
    if (name.includes('mushroom')) return '🍄';
    if (name.includes('avocado')) return '🥑';
    if (name.includes('corn')) return '🌽';
    if (name.includes('eggplant')) return '🍆';
    if (name.includes('cucumber')) return '🥒';
    if (name.includes('lettuce') || name.includes('salad')) return '🥗';
    if (name.includes('cheese')) return '🧀';
    if (name.includes('milk')) return '🥛';
    if (name.includes('cream')) return '🍦';
    if (name.includes('butter')) return '🧈';
    if (name.includes('egg')) return '🥚';
    if (name.includes('chicken')) return '🍗';
    if (name.includes('beef') || name.includes('steak')) return '🥩';
    if (name.includes('pork') || name.includes('bacon')) return '🥓';
    if (name.includes('fish') || name.includes('salmon')) return '🐟';
    if (name.includes('shrimp') || name.includes('prawn')) return '🦐';
    if (name.includes('rice')) return '🍚';
    if (name.includes('pasta') || name.includes('noodle')) return '🍝';
    if (name.includes('bread')) return '🍞';
    if (name.includes('flour')) return '🌾';
    if (name.includes('sugar')) return '🍬';
    if (name.includes('chocolate')) return '🍫';
    if (name.includes('vanilla')) return '🟫';
    if (name.includes('cinnamon') || name.includes('spice')) return '🌰';
    if (name.includes('basil') || name.includes('herb')) return '🌿';
    if (name.includes('parsley') || name.includes('cilantro')) return '🌿';
    if (name.includes('chili') || name.includes('jalapeno')) return '🌶️';
    if (name.includes('coconut')) return '🥥';
    if (name.includes('peanut') || name.includes('nut')) return '🥜';
    if (name.includes('wine')) return '🍷';
    if (name.includes('beer')) return '🍺';
    if (name.includes('coffee')) return '☕';
    if (name.includes('tea')) return '🍵';

    return '🥘';
  };

  const allIngredientsChecked = checkedIngredients.size === recipe.ingredients.length;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const convertToMetric = (quantity: number, unit: string) => {
    const unitLower = unit.toLowerCase();

    // Volume conversions
    if (unitLower.includes('cup')) {
      return { quantity: Math.round(quantity * 240), unit: 'ml' };
    }
    if (unitLower.includes('tablespoon') || unitLower.includes('tbsp')) {
      return { quantity: Math.round(quantity * 15), unit: 'ml' };
    }
    if (unitLower.includes('teaspoon') || unitLower.includes('tsp')) {
      return { quantity: Math.round(quantity * 5), unit: 'ml' };
    }
    if (unitLower.includes('fluid ounce') || unitLower.includes('fl oz')) {
      return { quantity: Math.round(quantity * 30), unit: 'ml' };
    }
    if (unitLower.includes('pint')) {
      return { quantity: Math.round(quantity * 473), unit: 'ml' };
    }
    if (unitLower.includes('quart')) {
      return { quantity: Math.round(quantity * 946), unit: 'ml' };
    }
    if (unitLower.includes('gallon')) {
      return { quantity: (quantity * 3.785).toFixed(2), unit: 'L' };
    }

    // Weight conversions
    if (unitLower.includes('pound') || unitLower.includes('lb')) {
      return { quantity: Math.round(quantity * 454), unit: 'g' };
    }
    if (unitLower.includes('ounce') || unitLower.includes('oz')) {
      return { quantity: Math.round(quantity * 28), unit: 'g' };
    }

    // Temperature
    if (unitLower.includes('°f') || unitLower.includes('fahrenheit')) {
      const celsius = Math.round((quantity - 32) * 5 / 9);
      return { quantity: celsius, unit: '°C' };
    }

    return { quantity, unit };
  };

  const scaleIngredient = (quantity: string, unit: string) => {
    const originalServings = recipe.servings || 4;
    const scaleFactor = servings / originalServings;

    // Parse fraction or decimal
    let quantityNum = parseFloat(quantity);
    if (quantity.includes('/')) {
      const parts = quantity.split(' ');
      let whole = 0;
      let fraction = parts[parts.length - 1];
      if (parts.length > 1) {
        whole = parseFloat(parts[0]);
      }
      const [numerator, denominator] = fraction.split('/').map(parseFloat);
      quantityNum = whole + (numerator / denominator);
    }

    if (isNaN(quantityNum)) {
      return { quantity, unit };
    }

    let scaledQuantity = quantityNum * scaleFactor;
    let finalUnit = unit;

    // Convert to metric if enabled
    if (isMetric) {
      const converted = convertToMetric(scaledQuantity, unit);
      scaledQuantity = typeof converted.quantity === 'string' ? parseFloat(converted.quantity) : converted.quantity;
      finalUnit = converted.unit;
    }

    // Format the quantity
    if (scaledQuantity % 1 === 0) {
      return { quantity: scaledQuantity.toString(), unit: finalUnit };
    } else if (scaledQuantity < 1 && !isMetric) {
      const fraction = scaledQuantity;
      if (Math.abs(fraction - 0.25) < 0.05) return { quantity: '1/4', unit: finalUnit };
      if (Math.abs(fraction - 0.33) < 0.05) return { quantity: '1/3', unit: finalUnit };
      if (Math.abs(fraction - 0.5) < 0.05) return { quantity: '1/2', unit: finalUnit };
      if (Math.abs(fraction - 0.67) < 0.05) return { quantity: '2/3', unit: finalUnit };
      if (Math.abs(fraction - 0.75) < 0.05) return { quantity: '3/4', unit: finalUnit };
      return { quantity: scaledQuantity.toFixed(2), unit: finalUnit };
    } else if (scaledQuantity >= 1 && !isMetric) {
      const whole = Math.floor(scaledQuantity);
      const fractional = scaledQuantity - whole;

      if (fractional < 0.05) {
        return { quantity: whole.toString(), unit: finalUnit };
      } else if (Math.abs(fractional - 0.25) < 0.05) {
        return { quantity: `${whole} 1/4`, unit: finalUnit };
      } else if (Math.abs(fractional - 0.33) < 0.05) {
        return { quantity: `${whole} 1/3`, unit: finalUnit };
      } else if (Math.abs(fractional - 0.5) < 0.05) {
        return { quantity: `${whole} 1/2`, unit: finalUnit };
      } else if (Math.abs(fractional - 0.67) < 0.05) {
        return { quantity: `${whole} 2/3`, unit: finalUnit };
      } else if (Math.abs(fractional - 0.75) < 0.05) {
        return { quantity: `${whole} 3/4`, unit: finalUnit };
      } else {
        return { quantity: scaledQuantity.toFixed(2), unit: finalUnit };
      }
    } else {
      return { quantity: scaledQuantity.toFixed(1), unit: finalUnit };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-hidden">
      <div className="h-full flex flex-col">
        
        {/* Header - Mobile Optimized */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between shadow-lg flex-shrink-0">
          <div className="flex-1 min-w-0 mr-2">
            <h2 className="text-base sm:text-lg md:text-xl font-bold truncate">
              {recipe.title}
            </h2>
            <p className="text-orange-100 text-[10px] sm:text-xs">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-1 sm:h-1.5 flex-shrink-0">
          <div
            className="bg-orange-600 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 pb-24">
            
            {/* Recipe Image */}
            <div className="relative w-full h-40 sm:h-48 md:h-64 rounded-lg sm:rounded-xl overflow-hidden shadow-lg flex-shrink-0">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 md:bottom-4 md:left-4 md:right-4">
                <h3 className="text-white text-base sm:text-lg md:text-xl font-bold drop-shadow-lg line-clamp-1">
                  {recipe.title}
                </h3>
                <p className="text-white/90 text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 drop-shadow">
                  {recipe.prepTime + recipe.cookTime} min • {recipe.servings} servings
                </p>
              </div>
            </div>

            {/* Voice Control Toggle */}
            <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 shadow-sm ${
              voiceModeActive 
                ? 'bg-orange-50 border-orange-300' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
            }`}>
              <Button
                onClick={() => setVoiceModeActive(!voiceModeActive)}
                className={`w-full font-semibold h-10 sm:h-11 text-sm sm:text-base ${
                  voiceModeActive
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                }`}
              >
                {voiceModeActive ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Disable Voice Control
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Enable Voice Control
                  </>
                )}
              </Button>
              <p className="text-[10px] sm:text-xs text-gray-600 text-center mt-2">
                {voiceModeActive 
                  ? 'Say "Next", "Previous", "Repeat", or "Read ingredients"' 
                  : 'Navigate recipes hands-free with voice commands'}
              </p>
            </div>

            {/* Servings & Units Controls */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-emerald-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">Servings</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  >
                    <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <span className="text-base sm:text-lg font-bold text-gray-900 min-w-[1.5rem] sm:min-w-[2rem] text-center">
                    {servings}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setServings(servings + 1)}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>

              {/* Unit System Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                <span className="text-xs sm:text-sm font-semibold text-gray-900">Units</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant={!isMetric ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsMetric(false)}
                    className={`h-7 px-2 sm:px-3 text-xs sm:text-sm ${
                      !isMetric ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                    }`}
                  >
                    US
                  </Button>
                  <Button
                    variant={isMetric ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsMetric(true)}
                    className={`h-7 px-2 sm:px-3 text-xs sm:text-sm ${
                      isMetric ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                    }`}
                  >
                    Metric
                  </Button>
                </div>
              </div>

              {servings !== recipe.servings && (
                <p className="text-[10px] sm:text-xs text-emerald-700 text-center">
                  Scaled from original {recipe.servings} servings
                </p>
              )}
            </div>

            {/* Ingredients List */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                  {allIngredientsChecked ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  ) : (
                    <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  )}
                  Ingredients
                </h3>
                <span className="text-[10px] sm:text-xs text-gray-600">
                  {checkedIngredients.size}/{recipe.ingredients.length}
                </span>
              </div>
              <div className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => {
                  const scaled = scaleIngredient(ingredient.quantity, ingredient.unit);
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg transition-all ${
                        checkedIngredients.has(index)
                          ? 'bg-orange-100 border border-orange-300'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
                        {getIngredientEmoji(ingredient.name)}
                      </div>
                      <Checkbox
                        id={`ingredient-${index}`}
                        checked={checkedIngredients.has(index)}
                        onCheckedChange={() => toggleIngredient(index)}
                        className="flex-shrink-0"
                      />
                      <label
                        htmlFor={`ingredient-${index}`}
                        className={`text-xs sm:text-sm cursor-pointer flex-1 min-w-0 ${
                          checkedIngredients.has(index)
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        <span className="font-semibold">
                          {scaled.quantity} {scaled.unit}
                        </span>{' '}
                        {ingredient.name}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Step - Swipeable */}
            <div
              className="touch-pan-y select-none relative"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className={`bg-white rounded-lg sm:rounded-xl shadow-lg border-2 p-4 sm:p-6 md:p-8 transition-all ${
                checkedSteps.has(currentStep)
                  ? 'border-orange-600 bg-orange-50'
                  : 'border-gray-200'
              }`}>
                {/* Content wrapper with padding for floating buttons */}
                <div className="px-16 sm:px-20 md:px-24 -mx-4 sm:-mx-6 md:-mx-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Checkbox
                      id={`step-${currentStep}`}
                      checked={checkedSteps.has(currentStep)}
                      onCheckedChange={() => toggleStep(currentStep)}
                      className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                    />
                    <h3 className={`font-bold text-lg sm:text-xl md:text-2xl ${
                      checkedSteps.has(currentStep) ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}>
                      Step {currentStep + 1}
                    </h3>
                  </div>
                  {steps[currentStep]?.duration && (
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleTimer}
                        className={`gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 ${
                          timerActive && !timerPaused
                            ? 'border-orange-600 bg-orange-50'
                            : 'border-blue-300'
                        }`}
                      >
                        {timerActive && !timerPaused ? (
                          <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
                        ) : (
                          <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                        <span className="hidden sm:inline">
                          {timerActive && !timerPaused ? 'Pause' : 'Start'}
                        </span>
                      </Button>
                      {timerActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetTimer}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Timer Display */}
                {timerActive && (
                  <div
                    className={`mb-3 sm:mb-4 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl text-center ${
                      timeRemaining <= 10
                        ? 'bg-red-100 border-2 border-red-300 animate-pulse'
                        : 'bg-orange-100 border-2 border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <Timer className={`w-4 h-4 sm:w-5 sm:h-5 ${timeRemaining <= 10 ? 'text-red-600' : 'text-orange-600'}`} />
                      <span className={`font-mono text-3xl sm:text-4xl md:text-5xl font-bold ${timeRemaining <= 10 ? 'text-red-600' : 'text-orange-600'}`}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                    {timerPaused && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-2">Timer paused</p>
                    )}
                  </div>
                )}

                {/* Step Instruction */}
                <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                  {steps[currentStep].instruction}
                </p>

                {/* Swipe Hint */}
                <p className="text-[10px] sm:text-xs text-gray-400 text-center mt-4 sm:mt-6">
                  👆 Swipe left or right to navigate
                </p>
                </div>
              </div>

              {/* Floating Navigation Buttons */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none px-2 sm:px-4">
                <div className="flex items-center justify-between">
                  {/* Previous Button */}
                  {currentStep > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePrevStep}
                      className="pointer-events-auto bg-white/60 hover:bg-white/80 backdrop-blur-sm shadow-lg rounded-full w-12 h-12 sm:w-14 sm:h-14 touch-manipulation active:scale-95 transition-all z-50"
                    >
                      <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900" />
                    </Button>
                  )}

                  <div className="flex-1" />

                  {/* Next Button */}
                  {currentStep < steps.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNextStep}
                      className="pointer-events-auto bg-orange-500/60 hover:bg-orange-500/80 backdrop-blur-sm shadow-lg rounded-full w-12 h-12 sm:w-14 sm:h-14 touch-manipulation active:scale-95 transition-all z-50"
                    >
                      <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Fixed */}
        <div className="bg-white border-t-2 border-gray-200 px-3 py-2 sm:px-4 sm:py-3 shadow-lg flex-shrink-0 safe-area-bottom">
          <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-4xl mx-auto">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="gap-1 sm:gap-2 text-xs sm:text-sm px-4 sm:px-6 min-h-[44px] sm:min-h-[48px] touch-manipulation active:scale-95 transition-all font-semibold"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Previous</span>
              <span className="xs:hidden">Prev</span>
            </Button>

            <div className="flex-1 text-center px-2">
              <p className="text-[10px] sm:text-xs text-gray-600 font-medium">
                {voiceModeActive ? 'Say "Next" or swipe' : '👈 Swipe to navigate 👉'}
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleNextStep}
              disabled={currentStep === steps.length - 1}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 gap-1 sm:gap-2 text-xs sm:text-sm px-4 sm:px-6 min-h-[44px] sm:min-h-[48px] touch-manipulation active:scale-95 transition-all font-semibold shadow-md"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}