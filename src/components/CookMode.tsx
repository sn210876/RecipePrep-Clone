import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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

export default function CookMode() {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [checkedSteps, setCheckedSteps] = useState(new Set());
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [servings, setServings] = useState(4);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const recipe = {
    title: 'Chocolate Chip Cookies',
    imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop',
    prepTime: 15,
    cookTime: 12,
    servings: 4,
    ingredients: [
      { quantity: '2', unit: 'cups', name: 'all-purpose flour' },
      { quantity: '1', unit: 'tsp', name: 'baking soda' },
      { quantity: '1', unit: 'cup', name: 'butter, softened' },
      { quantity: '¾', unit: 'cup', name: 'granulated sugar' },
      { quantity: '¾', unit: 'cup', name: 'brown sugar' },
      { quantity: '2', unit: '', name: 'large eggs' },
      { quantity: '2', unit: 'tsp', name: 'vanilla extract' },
      { quantity: '2', unit: 'cups', name: 'chocolate chips' },
    ],
  };

  const steps = [
    { stepNumber: 1, instruction: 'Preheat oven to 375°F (190°C). Line baking sheets with parchment paper.', duration: '5 min' },
    { stepNumber: 2, instruction: 'In a medium bowl, whisk together flour and baking soda. Set aside.', duration: null },
    { stepNumber: 3, instruction: 'In a large bowl, cream together butter and both sugars until light and fluffy, about 3-4 minutes.', duration: '4 min' },
    { stepNumber: 4, instruction: 'Beat in eggs one at a time, then stir in vanilla extract.', duration: null },
    { stepNumber: 5, instruction: 'Gradually blend in the flour mixture. Fold in chocolate chips.', duration: null },
    { stepNumber: 6, instruction: 'Drop rounded tablespoons of dough onto prepared baking sheets, spacing 2 inches apart.', duration: null },
    { stepNumber: 7, instruction: 'Bake for 10-12 minutes or until golden brown around edges. Cool on baking sheets for 5 minutes.', duration: '12 min' },
    { stepNumber: 8, instruction: 'Transfer cookies to a wire rack to cool completely. Enjoy!', duration: null },
  ];

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
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
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
    const emojiMap = {
      flour: '🌾', sugar: '🍯', butter: '🧈', egg: '🥚',
      chocolate: '🍫', vanilla: '🟫', baking: '🧂',
    };
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (name.includes(key)) return emoji;
    }
    return '🥘';
  };

  const allIngredientsChecked = checkedIngredients.size === recipe.ingredients.length;
  const progress = ((currentStep + 1) / steps.length) * 100;

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
              onClick={() => console.log('Close')}
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

            {/* Servings Adjuster */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-emerald-200 shadow-sm">
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
              {servings !== recipe.servings && (
                <p className="text-[10px] sm:text-xs text-emerald-700 mt-2 text-center">
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
                {recipe.ingredients.map((ingredient, index) => (
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
                        {ingredient.quantity} {ingredient.unit}
                      </span>{' '}
                      {ingredient.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Step - Swipeable */}
            <div
              className="touch-pan-y select-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className={`bg-white rounded-lg sm:rounded-xl shadow-lg border-2 p-4 sm:p-6 md:p-8 transition-all ${
                checkedSteps.has(currentStep)
                  ? 'border-orange-600 bg-orange-50'
                  : 'border-gray-200'
              }`}>
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
              className="gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 h-10 sm:h-11"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Previous</span>
              <span className="xs:hidden">Prev</span>
            </Button>

            <div className="flex-1 text-center">
              <p className="text-[10px] sm:text-xs text-gray-600">
                {voiceModeActive ? 'Say "Next" or swipe' : 'Swipe to navigate'}
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleNextStep}
              disabled={currentStep === steps.length - 1}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 h-10 sm:h-11"
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