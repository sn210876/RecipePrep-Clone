export type UnitType = 'volume' | 'weight' | 'count' | 'other';

export interface UnitConversion {
  type: UnitType;
  toBase: number;
}

export const unitDatabase: Record<string, UnitConversion> = {
  'cup': { type: 'volume', toBase: 240 },
  'cups': { type: 'volume', toBase: 240 },
  'c': { type: 'volume', toBase: 240 },
  'tablespoon': { type: 'volume', toBase: 15 },
  'tablespoons': { type: 'volume', toBase: 15 },
  'tbsp': { type: 'volume', toBase: 15 },
  'teaspoon': { type: 'volume', toBase: 5 },
  'teaspoons': { type: 'volume', toBase: 5 },
  'tsp': { type: 'volume', toBase: 5 },
  'milliliter': { type: 'volume', toBase: 1 },
  'milliliters': { type: 'volume', toBase: 1 },
  'ml': { type: 'volume', toBase: 1 },
  'liter': { type: 'volume', toBase: 1000 },
  'liters': { type: 'volume', toBase: 1000 },
  'l': { type: 'volume', toBase: 1000 },
  'fluid ounce': { type: 'volume', toBase: 30 },
  'fluid ounces': { type: 'volume', toBase: 30 },
  'fl oz': { type: 'volume', toBase: 30 },
  'pint': { type: 'volume', toBase: 480 },
  'pints': { type: 'volume', toBase: 480 },
  'pt': { type: 'volume', toBase: 480 },
  'quart': { type: 'volume', toBase: 960 },
  'quarts': { type: 'volume', toBase: 960 },
  'qt': { type: 'volume', toBase: 960 },
  'gallon': { type: 'volume', toBase: 3840 },
  'gallons': { type: 'volume', toBase: 3840 },
  'gal': { type: 'volume', toBase: 3840 },

  'gram': { type: 'weight', toBase: 1 },
  'grams': { type: 'weight', toBase: 1 },
  'g': { type: 'weight', toBase: 1 },
  'kilogram': { type: 'weight', toBase: 1000 },
  'kilograms': { type: 'weight', toBase: 1000 },
  'kg': { type: 'weight', toBase: 1000 },
  'ounce': { type: 'weight', toBase: 28.35 },
  'ounces': { type: 'weight', toBase: 28.35 },
  'oz': { type: 'weight', toBase: 28.35 },
  'pound': { type: 'weight', toBase: 453.59 },
  'pounds': { type: 'weight', toBase: 453.59 },
  'lb': { type: 'weight', toBase: 453.59 },
  'lbs': { type: 'weight', toBase: 453.59 },
  'milligram': { type: 'weight', toBase: 0.001 },
  'milligrams': { type: 'weight', toBase: 0.001 },
  'mg': { type: 'weight', toBase: 0.001 },

  'piece': { type: 'count', toBase: 1 },
  'pieces': { type: 'count', toBase: 1 },
  'whole': { type: 'count', toBase: 1 },
  'item': { type: 'count', toBase: 1 },
  'items': { type: 'count', toBase: 1 },
  'clove': { type: 'count', toBase: 1 },
  'cloves': { type: 'count', toBase: 1 },
  'slice': { type: 'count', toBase: 1 },
  'slices': { type: 'count', toBase: 1 },
  '': { type: 'count', toBase: 1 },
};

export function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim();
}

export function getUnitInfo(unit: string): UnitConversion | null {
  const normalized = normalizeUnit(unit);
  return unitDatabase[normalized] || null;
}

export function canConvertUnits(unit1: string, unit2: string): boolean {
  const info1 = getUnitInfo(unit1);
  const info2 = getUnitInfo(unit2);

  if (!info1 || !info2) return false;
  return info1.type === info2.type;
}

export function convertToBaseUnit(quantity: number, unit: string): number | null {
  const unitInfo = getUnitInfo(unit);
  if (!unitInfo) return null;

  return quantity * unitInfo.toBase;
}

export function convertFromBaseUnit(baseQuantity: number, targetUnit: string): number | null {
  const unitInfo = getUnitInfo(targetUnit);
  if (!unitInfo) return null;

  return baseQuantity / unitInfo.toBase;
}

export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number | null {
  if (!canConvertUnits(fromUnit, toUnit)) return null;

  const baseQuantity = convertToBaseUnit(quantity, fromUnit);
  if (baseQuantity === null) return null;

  return convertFromBaseUnit(baseQuantity, toUnit);
}

export function getBestDisplayUnit(baseQuantity: number, unitType: UnitType): { quantity: number; unit: string } {
  if (unitType === 'volume') {
    if (baseQuantity >= 3840) {
      return { quantity: baseQuantity / 3840, unit: 'gallon' };
    } else if (baseQuantity >= 960) {
      return { quantity: baseQuantity / 960, unit: 'quart' };
    } else if (baseQuantity >= 240) {
      return { quantity: baseQuantity / 240, unit: 'cup' };
    } else if (baseQuantity >= 15) {
      return { quantity: baseQuantity / 15, unit: 'tbsp' };
    } else {
      return { quantity: baseQuantity / 5, unit: 'tsp' };
    }
  } else if (unitType === 'weight') {
    if (baseQuantity >= 1000) {
      return { quantity: baseQuantity / 1000, unit: 'kg' };
    } else if (baseQuantity >= 453.59) {
      return { quantity: baseQuantity / 453.59, unit: 'lb' };
    } else if (baseQuantity >= 28.35) {
      return { quantity: baseQuantity / 28.35, unit: 'oz' };
    } else {
      return { quantity: baseQuantity, unit: 'g' };
    }
  } else {
    return { quantity: baseQuantity, unit: '' };
  }
}

export function parseQuantity(quantityStr: string): number {
  quantityStr = quantityStr.trim();

  if (quantityStr.includes('/')) {
    const parts = quantityStr.split(/\s+/);
    let total = 0;

    for (const part of parts) {
      if (part.includes('/')) {
        const [num, denom] = part.split('/').map(n => parseFloat(n));
        if (!isNaN(num) && !isNaN(denom) && denom !== 0) {
          total += num / denom;
        }
      } else {
        const num = parseFloat(part);
        if (!isNaN(num)) {
          total += num;
        }
      }
    }

    return total;
  }

  const num = parseFloat(quantityStr);
  return isNaN(num) ? 0 : num;
}

export function formatQuantity(quantity: number): string {
  if (quantity === Math.floor(quantity)) {
    return quantity.toString();
  }

  const commonFractions: Record<string, string> = {
    '0.25': '1/4',
    '0.33': '1/3',
    '0.5': '1/2',
    '0.66': '2/3',
    '0.67': '2/3',
    '0.75': '3/4',
  };

  const whole = Math.floor(quantity);
  const decimal = quantity - whole;
  const rounded = decimal.toFixed(2);

  if (commonFractions[rounded]) {
    return whole > 0 ? `${whole} ${commonFractions[rounded]}` : commonFractions[rounded];
  }

  if (decimal < 0.01) {
    return whole.toString();
  }

  return quantity.toFixed(2).replace(/\.?0+$/, '');
}
