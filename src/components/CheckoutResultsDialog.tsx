import { ExternalLink, ShoppingCart, Package, Search, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { type CheckoutResult } from '../services/amazonSearchFallback';
import { appendAffiliateTag } from '../services/amazonProductService';

interface CheckoutResultsDialogProps {
  open: boolean;
  onClose: () => void;
  result: CheckoutResult | null;
  serviceName: string;
}

export function CheckoutResultsDialog({
  open,
  onClose,
  result,
  serviceName
}: CheckoutResultsDialogProps) {
  if (!result) return null;

  const handleProceedToCheckout = () => {
    if (result.cartUrl) {
      const affiliateUrl = appendAffiliateTag(result.cartUrl);
      window.open(affiliateUrl, '_blank');
    }
    onClose();
  };

  const handleSearchItem = (searchUrl: string) => {
    const affiliateUrl = appendAffiliateTag(searchUrl);
    window.open(affiliateUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[80vh]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {serviceName} Checkout Ready
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(80vh-120px)]">
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

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {result.hasCartItems && result.cartUrl && (
            <Button onClick={handleProceedToCheckout}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Proceed to {serviceName} Checkout
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


}
