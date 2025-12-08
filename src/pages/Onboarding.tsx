import { useState } from 'react';
import { ChefHat, Link as LinkIcon, Camera, ClipboardPaste, Sparkles, Calendar, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { TutorialVideo } from '../components/TutorialVideo';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    title: 'Welcome to MealScrape',
    emoji: '👋',
    description: 'Your personal recipe companion that helps you save, organize, and plan meals effortlessly.',
    icon: ChefHat,
    color: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600'
  },
  {
    id: 2,
    title: 'Quick Start Guide',
    description: 'Watch this short video to learn how to use MealScrape',
    icon: Sparkles,
    color: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    videoUrl: 
      'https://vohvdarghgqskzqjclux.supabase.co/storage/v1/object/public/posts/videos/How%20To%20Use%20Mealscrape.mp4'
    
  },
  {
    id: 3,
    title: 'Save Any Recipe',
    description: 'Extract recipes from any website, upload photos, or paste descriptions. We handle the rest.',
    methods: [
      { icon: LinkIcon, label: 'Paste URL', desc: 'From any website' },
      { icon: Camera, label: 'Take Photo', desc: 'From cookbooks' },
      { icon: ClipboardPaste, label: 'Paste Text', desc: 'From anywhere' }
    ],
    icon: Sparkles,
    color: 'from-orange-500 to-amber-600',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600'
  },
  {
    id: 4,
    title: 'Everything Organized',
    description: 'Beautifully formatted recipes with smart editing, meal planning, and grocery lists.',
    features: [
      { icon: Sparkles, label: 'Auto Formatting', desc: 'Clean, readable recipes' },
      { icon: Calendar, label: 'Meal Planning', desc: 'Weekly calendar view' },
      { icon: ShoppingCart, label: 'Grocery Lists', desc: 'Auto-generated' }
    ],
    icon: Calendar,
    color: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    id: 5,
    title: 'Ready to Start?',
    description: 'Join thousands of home cooks who are making meal planning easier every day.',
    icon: ChefHat,
    color: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    stats: [
      { value: '10K+', label: 'Future Users' },
      { value: '50K+', label: 'Recipes Saved' },
      { value: '5.0★', label: 'User Rating' }
    ]
  }
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    onComplete();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col overflow-hidden"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))'
      }}
    >
      {currentSlide < slides.length - 1 && (
        <div className="absolute top-4 right-4 z-10" style={{ top: 'max(1rem, calc(env(safe-area-inset-top) + 1rem))' }}>
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="text-gray-600 hover:text-gray-900 hover:bg-white/50"
          >
            Skip
          </Button>
        </div>
      )}

      <div
        className="flex-1 flex items-center justify-center px-4 py-8"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="max-w-lg w-full">
          <div
            key={currentSlide}
            className="animate-in fade-in slide-in-from-right duration-500"
          >
            <div className="text-center mb-8 space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-12 h-12 text-white" strokeWidth={2} />
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                  {slide.title} {slide.emoji}
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {slide.description}
                </p>
              </div>

              {slide.methods && (
                <div className="grid grid-cols-1 gap-3 mt-8">
                  {slide.methods.map((method, idx) => {
                    const MethodIcon = method.icon;
                    return (
                      <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl ${slide.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <MethodIcon className={`w-6 h-6 ${slide.iconColor}`} />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-gray-900">{method.label}</div>
                            <div className="text-sm text-gray-600">{method.desc}</div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {slide.features && (
                <div className="grid grid-cols-1 gap-3 mt-8">
                  {slide.features.map((feature, idx) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl ${slide.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <FeatureIcon className={`w-6 h-6 ${slide.iconColor}`} />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-gray-900">{feature.label}</div>
                            <div className="text-sm text-gray-600">{feature.desc}</div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {slide.stats && (
                <div className="grid grid-cols-3 gap-4 mt-8">
                  {slide.stats.map((stat, idx) => (
                    <Card key={idx} className="p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{stat.value}</div>
                      <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                    </Card>
                  ))}
                </div>
              )}

            {(slide as any).videoUrl && (
  <div className="mt-8">
    <TutorialVideo
      src={(slide as any).videoUrl}
      width="70%"
    />
  </div>
)}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-6">
        <div className="flex justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? 'w-8 bg-emerald-600'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleNext}
            size="lg"
            className={`w-full bg-gradient-to-r ${slide.color} text-white py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0`}
          >
            {currentSlide === slides.length - 1 ? "Let's Go!" : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
