import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface VerifyingProps {
  onComplete: () => void;
}

export function Verifying({ onComplete }: VerifyingProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center px-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-100">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-6 relative">
              <CheckCircle2 className="w-12 h-12 text-white animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl animate-ping opacity-75"></div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Verifying...
            </h1>
            <p className="text-gray-600 mb-6">
              Loading...
            </p>

            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Redirecting you to the app...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
