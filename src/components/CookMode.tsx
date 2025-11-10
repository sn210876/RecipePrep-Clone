import { useState, useEffect, useRef } from 'react';
import { Recipe } from '../types/recipe';
import { StepVisualizer } from './StepVisualizer';
import { VoiceControls, VoiceCommand, VoiceSettings } from './VoiceControls';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
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
} from 'lucide-react';
import NoSleep from 'nosleep.js';

interface CookModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export function CookMode({ recipe, onClose }: CookModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [voiceSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('voiceSettings');
    return saved ? JSON.parse(saved) : { speechRate: 1.0, voiceIndex: 0, autoRead: true };
  });
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const noSleepRef = useRef<NoSleep | null>(null);
  const wakeLockRef = useRef<any>(null);
  const prevStepRef = useRef<number>(0);

  const steps = recipe.steps || recipe.instructions.map((instruction, index) => ({
    stepNumber: index + 1,
    instruction,
    technique: 'mix',
    diagramType: 'mix',
    duration: undefined,
    videoUrl: undefined
  }));

  useEffect(() => {
    if (voiceModeActive && voiceSettings.autoRead && currentStep !== prevStepRef.current) {
      prevStepRef.current = currentStep;
      setTimeout(() => {
        speakStep(currentStep);
      }, 500);
    }
  }, [currentStep, voiceModeActive, voiceSettings.autoRead]);

  useEffect(() => {
    const enableWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock activated');
        } else {
          noSleepRef.current = new NoSleep();
          noSleepRef.current.enable();
          console.log('NoSleep.js activated');
        }
      } catch (err) {
        console.log('Wake lock error, using NoSleep.js fallback');
        noSleepRef.current = new NoSleep();
        noSleepRef.current.enable();
      }
    };

    enableWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleIngredient = (index: number) => {
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

  const toggleStep = (index: number) => {
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

  const speakStep = (stepIndex: number) => {
    if ('speechSynthesis' in window && steps[stepIndex]) {
      window.speechSynthesis.cancel();

      const step = steps[stepIndex];
      let text = `Step ${stepIndex + 1}. ${step.instruction}`;

      if (step.duration) {
        text += `. This step takes ${step.duration}.`;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSettings.speechRate;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 && voiceSettings.voiceIndex < voices.length) {
        utterance.voice = voices[voiceSettings.voiceIndex];
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const speakIngredients = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      let text = 'Ingredients you need: ';
      recipe.ingredients.forEach((ingredient, index) => {
        text += `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`;
        if (index < recipe.ingredients.length - 1) {
          text += ', ';
        }
      });

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSettings.speechRate;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 && voiceSettings.voiceIndex < voices.length) {
        utterance.voice = voices[voiceSettings.voiceIndex];
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const speakDuration = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const step = steps[currentStep];
      const text = step?.duration
        ? `This step takes ${step.duration}`
        : 'This step has no specific duration';

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSettings.speechRate;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 && voiceSettings.voiceIndex < voices.length) {
        utterance.voice = voices[voiceSettings.voiceIndex];
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceCommand = (command: VoiceCommand) => {
    switch (command.type) {
      case 'next':
        if (currentStep < steps.length - 1) {
          handleNextStep();
        }
        break;
      case 'previous':
        if (currentStep > 0) {
          handlePrevStep();
        }
        break;
      case 'repeat':
        speakStep(currentStep);
        break;
      case 'readIngredients':
        speakIngredients();
        break;
      case 'howLong':
        speakDuration();
        break;
      case 'startTimer':
        if (steps[currentStep]?.duration) {
          startTimer();
        }
        break;
      case 'pause':
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        break;
      case 'resume':
        speakStep(currentStep);
        break;
      case 'jumpTo':
        if (command.stepNumber >= 0 && command.stepNumber < steps.length) {
          setCurrentStep(command.stepNumber);
          resetTimer();
        }
        break;
    }
  };

  const allIngredientsChecked = checkedIngredients.size === recipe.ingredients.length;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const getIngredientEmoji = (ingredientName: string): string => {
    const name = ingredientName.toLowerCase().trim();

    const emojiMap: { [key: string]: string } = {
      chicken: '🍗', beef: '🥩', pork: '🍖', lamb: '🐑', turkey: '🦃',
      fish: '🐟', salmon: '🐠', shrimp: '🦐', crab: '🦀', lobster: '🦞',
      eggs: '🥚', flour: '🌾', sugar: '🍯', salt: '🧂', egg: '🥚',
      butter: '🧈', oil: '🫒', milk: '🥛', cheese: '🧀', cream: '🍶',
      bread: '🍞', rice: '🍚', pasta: '🍝', noodles: '🍜', beans: '🫘',
      potato: '🥔', carrot: '🥕', onion: '🧅', garlic: '🧄', tomato: '🍅',
      lettuce: '🥬', spinach: '🥬', broccoli: '🥦', cauliflower: '🥦', bell_pepper: '🫑',
      mushroom: '🍄', apple: '🍎', banana: '🍌', lemon: '🍋', orange: '🍊',
      strawberry: '🍓', blueberry: '🫐', grape: '🍇', watermelon: '🍉', nuts: '🥜',
      honey: '🍯', vinegar: '🍶', sauce: '🫙', ketchup: '🍅', mustard: '🟨',
      soy: '🫙', sesame: '⚪', olive: '🫒', coconut: '🥥', avocado: '🥑',
      basil: '🌿', parsley: '🌿', cilantro: '🌿', mint: '🌿', oregano: '🌿',
      thyme: '🌿', rosemary: '🌿', chili: '🌶️', hot_pepper: '🌶️',
      water: '💧', wine: '🍷', beer: '🍺', whiskey: '🥃', lime: '🟢',
      ginger: '🟤', turmeric: '🟡', paprika: '🟠', cumin: '⚫', cinnamon: '🟤',
      vanilla: '🟫', chocolate: '🍫', cocoa: '🟤', almond: '🥜', walnut: '🫘',
      pine: '🌲', sunflower: '🌻', corn: '🌽', pea: '🟢', asparagus: '🥒',
      lentil: '🫘', chickpea: '🌰', tofu: '🟫', tempeh: '🟪',
      quiche: '🥧', pie: '🥧', cake: '🎂', cookie: '🍪', muffin: '🧁',
      pancake: '🥞', waffle: '🧇', donut: '🍩', pretzel: '🥨', bagel: '🥯',
      croissant: '🥐', bun: '🫓', pizza: '🍕', taco: '🌮',
      burrito: '🌯', sandwich: '🥪', wrap: '🫔', kebab: '🍢', dumpling: '🥟',
      sushi: '🍣', spring: '🥠', gyoza: '🥟', meatball: '🍖',
      steak: '🥩', roast: '🍖', ham: '🍗', bacon: '🥓', sausage: '🌭',
      hotdog: '🌭', burger: '🍔', fries: '🍟', chips: '🍟',
      roll: '🍣', bean: '🫘'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (name.includes(key)) {
        return emoji;
      }
    }

    return '🥘';
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-lg">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold truncate">{recipe.title}</h2>
            <p className="text-emerald-100 text-xs sm:text-sm">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white hover:bg-white/20"
            >
              {soundEnabled ? (
                <Volume2 className="w-3 h-3" />
              ) : (
                <VolumeX className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>

        <div className="w-full bg-gray-200 h-1 sm:h-2">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {recipe.imageUrl && (
              <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden shadow-lg">
                <img
                  src={recipe.imageUrl?.includes('instagram.com') || recipe.imageUrl?.includes('cdninstagram.com')
                    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(recipe.imageUrl.replace(/&amp;/g, '&'))}`
                    : recipe.imageUrl}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white text-xl sm:text-2xl font-bold drop-shadow-lg">
                    {recipe.title}
                  </h3>
                  <p className="text-white/90 text-sm mt-1 drop-shadow">
                    {recipe.prepTime + recipe.cookTime} min • {recipe.servings} servings
                  </p>
                </div>
              </div>
            )}

            {voiceModeActive && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-300 shadow-sm">
                <VoiceControls
                  onCommand={handleVoiceCommand}
                  isActive={voiceModeActive}
                  onToggle={() => setVoiceModeActive(!voiceModeActive)}
                  voiceSettings={voiceSettings}
                />
              </div>
            )}

            {!voiceModeActive && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-300 shadow-sm">
                <Button
                  onClick={() => setVoiceModeActive(true)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold"
                  size="lg"
                >
                  Enable Voice Control for Hands-Free Cooking
                </Button>
                <p className="text-xs text-gray-600 text-center mt-2">
                  Navigate recipes with voice commands while cooking
                </p>
              </div>
            )}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 sm:p-6 border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  {allIngredientsChecked ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Circle className="w-3 h-3 text-gray-400" />
                  )}
                  Ingredients
                </h3>
                <span className="text-xs sm:text-sm text-gray-600">
                  {checkedIngredients.size}/{recipe.ingredients.length} checked
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-2 sm:p-3 rounded-lg transition-all ${
                      checkedIngredients.has(index)
                        ? 'bg-emerald-100 border border-emerald-300'
                        : 'bg-white border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {getIngredientEmoji(ingredient.name)}
                    </div>
                    <Checkbox
                      id={`ingredient-${index}`}
                      checked={checkedIngredients.has(index)}
                      onCheckedChange={() => toggleIngredient(index)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <label
                      htmlFor={`ingredient-${index}`}
                      className={`text-sm sm:text-base cursor-pointer flex-1 ${
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

            <div
              className="touch-pan-y select-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className={`bg-white rounded-xl shadow-lg border-2 transition-all scale-[0.8] origin-top ${
                voiceModeActive
                  ? 'p-6 sm:p-10'
                  : 'p-4 sm:p-8'
              } ${
                checkedSteps.has(currentStep)
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`step-${currentStep}`}
                      checked={checkedSteps.has(currentStep)}
                      onCheckedChange={() => toggleStep(currentStep)}
                      className="w-6 h-6"
                    />
                    <h3 className={`font-bold ${
                      voiceModeActive ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'
                    } ${
                      checkedSteps.has(currentStep) ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}>
                      Step {currentStep + 1}
                    </h3>
                  </div>
                  {steps[currentStep]?.duration && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleTimer}
                        className={`gap-2 ${
                          timerActive && !timerPaused
                            ? 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100'
                            : 'border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {timerActive && !timerPaused ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        {timerActive && !timerPaused ? 'Pause' : 'Start'}
                      </Button>
                      {timerActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetTimer}
                          className="border-gray-300"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {timerActive && (
                  <div
                    className={`mb-4 sm:mb-6 p-4 sm:p-6 rounded-xl text-center ${
                      timeRemaining <= 10
                        ? 'bg-red-100 border-2 border-red-300 animate-pulse'
                        : 'bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Timer className={`w-4 h-4 sm:w-5 sm:h-5 ${timeRemaining <= 10 ? 'text-red-600' : 'text-emerald-600'}`} />
                      <span className={`font-mono text-4xl sm:text-6xl font-bold ${timeRemaining <= 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                    {timerPaused && (
                      <p className="text-sm text-gray-600 mt-2">Timer paused</p>
                    )}
                  </div>
                )}

                <StepVisualizer step={steps[currentStep]} />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="bg-white border-t-2 border-gray-200 px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
          <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-4xl mx-auto">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="gap-1 sm:gap-2 text-sm sm:text-base px-3 sm:px-6"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>

            <div className="flex-1 text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                {voiceModeActive ? 'Say "Next" or swipe' : 'Swipe to navigate'}
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleNextStep}
              disabled={currentStep === steps.length - 1}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 gap-1 sm:gap-2 text-sm sm:text-base px-3 sm:px-6"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
