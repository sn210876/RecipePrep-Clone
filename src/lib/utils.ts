import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

export function decimalToFraction(decimal: number | string): string {
  const num = typeof decimal === 'string' ? parseFloat(decimal) : decimal;

  if (isNaN(num) || num === 0) return '0';
  if (Number.isInteger(num)) return num.toString();

  const commonFractions: { [key: string]: string } = {
    '0.125': '1/8',
    '0.25': '1/4',
    '0.333': '1/3',
    '0.3333': '1/3',
    '0.375': '3/8',
    '0.5': '1/2',
    '0.625': '5/8',
    '0.666': '2/3',
    '0.6666': '2/3',
    '0.75': '3/4',
    '0.875': '7/8',
  };

  const absNum = Math.abs(num);
  const wholeNumber = Math.floor(absNum);
  const fractionalPart = absNum - wholeNumber;

  if (fractionalPart === 0) return num.toString();

  const fractionalStr = fractionalPart.toFixed(4);
  const fraction = commonFractions[fractionalStr];

  if (fraction) {
    if (wholeNumber === 0) {
      return num < 0 ? `-${fraction}` : fraction;
    }
    return num < 0 ? `-${wholeNumber} ${fraction}` : `${wholeNumber} ${fraction}`;
  }

  let denominator = 1;
  let numerator = fractionalPart;
  const precision = 0.0001;

  while (Math.abs(numerator - Math.round(numerator)) > precision && denominator < 100) {
    denominator++;
    numerator = fractionalPart * denominator;
  }

  numerator = Math.round(numerator);

  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(numerator, denominator);
  numerator /= divisor;
  denominator /= divisor;

  if (wholeNumber === 0) {
    return num < 0 ? `-${numerator}/${denominator}` : `${numerator}/${denominator}`;
  }

  return num < 0 ? `-${wholeNumber} ${numerator}/${denominator}` : `${wholeNumber} ${numerator}/${denominator}`;
}

export function normalizeQuantity(quantity: string): string {
  if (!quantity) return quantity;

  const decimalMatch = quantity.match(/(\d+\.?\d*)/);
  if (decimalMatch) {
    const decimal = decimalMatch[1];
    if (decimal.includes('.')) {
      const fraction = decimalToFraction(decimal);
      return quantity.replace(decimal, fraction);
    }
  }

  return quantity;
}
