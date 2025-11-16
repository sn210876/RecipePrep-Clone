import { RecipeStep } from '../types/recipe';
import { Card } from './ui/card';
import { Clock } from 'lucide-react';
import { decodeHtmlEntities } from '@/lib/utils';

interface StepVisualizerProps {
  step: RecipeStep;
}

export function StepVisualizer({ step }: StepVisualizerProps) {
  const getStepIcon = (instruction: string): string => {
    const text = instruction.toLowerCase();

    if (text.includes('preheat') || text.includes('oven') || text.includes('bake')) return '🔥';
    if (text.includes('boil') || text.includes('simmer')) return '💧';
    if (text.includes('chop') || text.includes('dice') || text.includes('slice') || text.includes('cut')) return '🔪';
    if (text.includes('mix') || text.includes('stir') || text.includes('whisk') || text.includes('combine')) return '🥄';
    if (text.includes('season') || text.includes('salt') || text.includes('pepper')) return '🧂';
    if (text.includes('serve') || text.includes('plate')) return '🍽️';
    if (text.includes('refrigerate') || text.includes('chill') || text.includes('cool')) return '❄️';
    if (text.includes('grill') || text.includes('bbq')) return '🍖';
    if (text.includes('blend') || text.includes('puree')) return '🌀';
    if (text.includes('fry') || text.includes('sauté') || text.includes('pan')) return '🍳';
    if (text.includes('egg')) return '🥚';
    if (text.includes('flour') || text.includes('dough') || text.includes('bread') || text.includes('toast')) return '🍞';
    if (text.includes('cheese')) return '🧀';
    if (text.includes('milk') || text.includes('cream') || text.includes('butter')) return '🥛';
    if (text.includes('tomato')) return '🍅';
    if (text.includes('onion')) return '🧅';
    if (text.includes('garlic')) return '🧄';
    if (text.includes('bell pepper')) return '🫑';
    if (text.includes('carrot')) return '🥕';
    if (text.includes('potato')) return '🥔';
    if (text.includes('meat') || text.includes('beef') || text.includes('steak')) return '🥩';
    if (text.includes('chicken') || text.includes('poultry')) return '🍗';
    if (text.includes('fish') || text.includes('salmon')) return '🐟';
    if (text.includes('pasta') || text.includes('noodle')) return '🍝';
    if (text.includes('rice')) return '🍚';
    if (text.includes('lemon') || text.includes('lime')) return '🍋';
    if (text.includes('herb') || text.includes('basil') || text.includes('parsley')) return '🌿';
    if (text.includes('oil') || text.includes('olive oil')) return '🫒';
    if (text.includes('wait') || text.includes('rest') || text.includes('stand')) return '⏱️';
    if (text.includes('wash') || text.includes('rinse') || text.includes('clean')) return '💦';
    if (text.includes('measure') || text.includes('weigh')) return '⚖️';
    if (text.includes('pour') || text.includes('add')) return '🫗';
    if (text.includes('mash') || text.includes('crush') || text.includes('smash')) return '🥄';
    if (text.includes('spread')) return '🧈';
    if (text.includes('roll') || text.includes('flatten')) return '🍞';
    if (text.includes('drain')) return '💧';
    if (text.includes('squeeze')) return '🍋';
    if (text.includes('peel')) return '🔪';
    if (text.includes('poach')) return '🥚';
    if (text.includes('assemble') || text.includes('top') || text.includes('garnish')) return '👨‍🍳';
    if (text.includes('avocado')) return '🥑';

    return '👨‍🍳';
  };

  const stepIcon = getStepIcon(step.instruction);

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="bg-orange-50 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white to-orange-100 flex items-center justify-center mb-4 shadow-md">
            <span className="text-7xl">{stepIcon}</span>
          </div>

          <div className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mb-4 shadow-sm">
            {step.stepNumber}
          </div>

          <p className="text-xl font-semibold text-gray-900 leading-relaxed mb-4 px-4">
            {decodeHtmlEntities(step.instruction)}
          </p>

          {step.duration && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">{step.duration}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
