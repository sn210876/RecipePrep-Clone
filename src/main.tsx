import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
  // ADD THIS useEffect in Discover.tsx
  useEffect(() => {
    const handleSharedPost = (e: any) => {
      const postId = e.detail;
      if (postId) {
        setCommentModalPostId(postId);
      }
    };

    window.addEventListener('open-shared-post', handleSharedPost);

    // Also check on first load in case someone opened the link directly
    const path = window.location.pathname;
    const match = path.match(/^\/post\/([a-f0-9-]{36})$/);
    if (match) {
      setCommentModalPostId(match[1]);
      window.history.replaceState({}, '', '/discover');
    }

    return () => {
      window.removeEventListener('open-shared-post', handleSharedPost);
    };
  }, []);