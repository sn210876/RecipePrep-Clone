import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface ErrorBannerProps {
  title: string;
  message: string;
  details?: string[];
  onDismiss?: () => void;
  severity?: 'error' | 'warning';
}

export function ErrorBanner({
  title,
  message,
  details,
  onDismiss,
  severity = 'error'
}: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const bgColor = severity === 'error' ? 'bg-red-50' : 'bg-yellow-50';
  const borderColor = severity === 'error' ? 'border-red-200' : 'border-yellow-200';
  const textColor = severity === 'error' ? 'text-red-900' : 'text-yellow-900';
  const iconColor = severity === 'error' ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] ${bgColor} border-b-2 ${borderColor} p-4 shadow-lg`}>
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${textColor} text-sm mb-1`}>{title}</h3>
          <p className={`${textColor} text-xs mb-2`}>{message}</p>

          {details && details.length > 0 && (
            <details className="text-xs">
              <summary className={`cursor-pointer ${textColor} font-medium mb-1`}>
                Show details
              </summary>
              <ul className={`${textColor} list-disc list-inside space-y-1 mt-2`}>
                {details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className={`${iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
