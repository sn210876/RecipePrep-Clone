import { ChefHat, Calendar, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const features = [
    {
      icon: ChefHat,
      title: 'Discover Recipes',
      description: 'Browse thousands of curated recipes from cuisines around the world. Filter by dietary preferences, cook time, and more.',
    },
    {
      icon: Calendar,
      title: 'Plan Your Meals',
      description: 'Drag and drop recipes onto your weekly calendar. Smart suggestions help you plan balanced, varied meals.',
    },
    {
      icon: ShoppingCart,
      title: 'Smart Grocery Lists',
      description: 'Automatically generate organized shopping lists from your meal plan. Check off items as you shop.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ChefHat className="w-12 h-12 text-emerald-600" strokeWidth={2} />
            <h1 className="text-5xl font-bold text-gray-900">Recipe Prep</h1>
          </div>
          <p className="text-xl text-gray-600 font-medium">
            Discover, Save, Plan, Shop - All in One Place
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="border-2 border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="pt-8 pb-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                    <Icon className="w-8 h-8 text-emerald-600" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            onClick={onComplete}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Get Started
          </Button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Join thousands of home cooks planning better meals
          </p>
        </div>
      </div>
    </div>
  );
}