import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            {/* Error Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border-2 border-red-200">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-orange-600 p-4 sm:p-6">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-2">
                  Oops! Something Went Wrong
                </h1>
                <p className="text-sm sm:text-base text-white/90 text-center">
                  Don't worry, we're here to help you get back on track
                </p>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                
                {/* User-friendly message */}
                <div className="bg-orange-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-orange-200">
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    We encountered an unexpected error. This has been logged and we'll look into it. 
                    In the meantime, try refreshing the page or returning to the home screen.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={this.handleReload}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold rounded-lg sm:rounded-xl px-4 py-3 sm:py-4 transition-all hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">Reload Page</span>
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg sm:rounded-xl px-4 py-3 sm:py-4 transition-all hover:scale-105 active:scale-95 shadow-md border-2 border-gray-200"
                  >
                    <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">Go Home</span>
                  </button>
                </div>

                {/* Development Mode - Error Details */}
                {isDevelopment && this.state.error && (
                  <details className="bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200">
                    <summary className="px-3 py-2 sm:px-4 sm:py-3 cursor-pointer hover:bg-gray-100 rounded-lg sm:rounded-xl transition-colors flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                      <Bug className="w-4 h-4" />
                      <span>Developer Info (Click to expand)</span>
                    </summary>
                    <div className="p-3 sm:p-4 border-t border-gray-200 space-y-3">
                      {/* Error Message */}
                      <div>
                        <h3 className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                          Error Message
                        </h3>
                        <div className="bg-red-50 border border-red-200 rounded p-2 sm:p-3">
                          <code className="text-[10px] sm:text-xs text-red-800 break-words">
                            {this.state.error.toString()}
                          </code>
                        </div>
                      </div>

                      {/* Stack Trace */}
                      {this.state.error.stack && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                            Stack Trace
                          </h3>
                          <div className="bg-gray-900 rounded p-2 sm:p-3 overflow-x-auto max-h-48 sm:max-h-64">
                            <pre className="text-[9px] sm:text-[10px] text-green-400 font-mono whitespace-pre-wrap break-words">
                              {this.state.error.stack}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Component Stack */}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                            Component Stack
                          </h3>
                          <div className="bg-gray-900 rounded p-2 sm:p-3 overflow-x-auto max-h-48 sm:max-h-64">
                            <pre className="text-[9px] sm:text-[10px] text-blue-400 font-mono whitespace-pre-wrap break-words">
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Production Mode - Contact Support */}
                {!isDevelopment && (
                  <div className="bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span>💬</span>
                      <span>Need Help?</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3">
                      If this problem persists, please contact our support team.
                    </p>
                    <button
                      onClick={() => window.location.href = 'mailto:support@mealscrape.app'}
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-semibold underline"
                    >
                      Contact Support →
                    </button>
                  </div>
                )}

                {/* Tips */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-200">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                    💡 Quick Fixes
                  </h3>
                  <ul className="text-xs sm:text-sm text-gray-600 space-y-1.5 sm:space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 shrink-0">•</span>
                      <span>Try refreshing the page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 shrink-0">•</span>
                      <span>Clear your browser cache and cookies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 shrink-0">•</span>
                      <span>Check your internet connection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 shrink-0">•</span>
                      <span>Update your browser to the latest version</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200">
                <p className="text-[10px] sm:text-xs text-center text-gray-500">
                  Error ID: {Date.now()} • Meal Scrape v1.0
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Demo Component to test ErrorBoundary
function DemoApp() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('This is a test error to demonstrate the ErrorBoundary!');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <span className="text-3xl">🍳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error Boundary Demo
          </h1>
          <p className="text-sm text-gray-600">
            Click the button below to trigger an error and see the ErrorBoundary in action
          </p>
        </div>

        <button
          onClick={() => setShouldError(true)}
          className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-semibold rounded-lg px-6 py-3 transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          Trigger Error
        </button>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> This demo shows how errors are caught and displayed in a user-friendly way on mobile devices.
          </p>
        </div>
      </div>
    </div>
  );
}

// Export with ErrorBoundary wrapper
export default function App() {
  return (
    <ErrorBoundary>
      <DemoApp />
    </ErrorBoundary>
  );
}