import { useState, useEffect } from 'react';
import { ExternalLink, ShoppingCart, Package, Search, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { type CheckoutResult } from '../services/amazonSearchFallback';
import { appendAffiliateTag } from '../services/amazonProductService';
import { toast } from 'sonner';

interface CheckoutResultsProps {
  onNavigate?: (page: string) => void;
}

interface CheckoutResultsData {
  result: CheckoutResult;
  serviceName: string;
}

export function CheckoutResults({ onNavigate }: CheckoutResultsProps) {
  const [resultsData, setResultsData] = useState<CheckoutResultsData | null>(null);

  useEffect(() => {
    const loadResults = () => {
      const stored = localStorage.getItem('checkout_results');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setResultsData(data);
        } catch (error) {
          console.error('Failed to parse checkout results:', error);
          toast.error('Failed to load checkout results');
          onNavigate?.('checkout');
        }
      } else {
        toast.error('No checkout results found');
        onNavigate?.('checkout');
      }
    };

    loadResults();
  }, [onNavigate]);

  if (!resultsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const { result, serviceName } = resultsData;

  const handleProceedToCheckout = () => {
    if (result.cartUrl) {
      const affiliateUrl = appendAffiliateTag(result.cartUrl);
      window.open(affiliateUrl, '_blank');
      toast.success('Checkout window opened - you can return anytime');
    }
  };

  const handleSearchItem = (searchUrl: string) => {
    const affiliateUrl = appendAffiliateTag(searchUrl);
    window.open(affiliateUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-2xl mx-auto p-4 pb-safe">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => onNavigate?.('checkout')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checkout
          </Button>

          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-6 h-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-gray-900">{serviceName} Checkout Ready</h1>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(100vh-200px)]">
          <div className="space-y-6 pr-4">
            {result.hasCartItems && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">
                      {result.mappedItems.length} Item{result.mappedItems.length !== 1 ? 's' : ''} Added to Cart
                    </h3>
                    <div className="space-y-2">
                      {result.mappedItems.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Package className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="text-green-900 font-medium">{item.name}</span>
                            {item.quantity && (
                              <span className="text-green-700 ml-2">
                                ({item.quantity} {item.unit || ''})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result.hasUnmappedItems && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 mb-2">
                      {result.unmappedItems.length} Item{result.unmappedItems.length !== 1 ? 's' : ''} Need Manual Search
                    </h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      These items weren't found in our database. Click to search on {serviceName}:
                    </p>
                    <div className="space-y-2">
                      {result.unmappedItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSearchItem(item.searchUrl)}
                            className="flex-1 justify-start text-left"
                          >
                            <Search className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{item.ingredient}</span>
                            {item.quantity && (
                              <Badge variant="secondary" className="ml-auto flex-shrink-0">
                                {item.quantity} {item.unit || ''}
                              </Badge>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!result.hasCartItems && !result.hasUnmappedItems && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No items to process</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-6 space-y-3">
          {result.hasCartItems && result.cartUrl && (
            <Button onClick={handleProceedToCheckout} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Proceed to {serviceName} Checkout
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onNavigate?.('grocery-list')}
            className="w-full"
          >
            Return to Grocery List
          </Button>
        </div>
      </div>
    </div>
  );
}
