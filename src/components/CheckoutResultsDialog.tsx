import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ShoppingCart, Search, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import type { CheckoutResult } from '../services/amazonSearchFallback';

interface CheckoutResultsDialogProps {
  open: boolean;
  onClose: () => void;
  result: CheckoutResult | null;
  serviceName?: string;
}

export function CheckoutResultsDialog({
  open,
  onClose,
  result,
  serviceName = 'Amazon',
}: CheckoutResultsDialogProps) {
  if (!result) return null;

  const handleOpenCart = () => {
    if (result.cartUrl) {
      window.open(result.cartUrl, '_blank');
    }
  };

  const handleSearchItem = (searchUrl: string) => {
    window.open(searchUrl, '_blank');
  };

  const handleSearchAllUnmapped = () => {
    const totalItems = result.unmappedItems.length;
    let openedCount = 0;

    for (let i = 0; i < totalItems; i++) {
      try {
        const newWindow = window.open(result.unmappedItems[i].searchUrl, `search_${i}`);
        if (newWindow && newWindow !== null) {
          openedCount++;
        }
      } catch (error) {
        console.error('Failed to open window:', error);
      }
    }

    if (openedCount === totalItems) {
      toast.success(`Opened all ${totalItems} search windows!`);
    } else if (openedCount > 0) {
      toast.warning(
        `Only opened ${openedCount} of ${totalItems} windows. Your browser blocked ${totalItems - openedCount}. ` +
        `Use the individual Search buttons for the rest.`,
        { duration: 5000 }
      );
    } else {
      const instructions = navigator.userAgent.includes('Chrome')
        ? 'Settings → Privacy and Security → Site Settings → Pop-ups'
        : navigator.userAgent.includes('Firefox')
        ? 'Settings → Privacy & Security → Permissions → Block pop-up windows'
        : 'Browser Settings → Popups';

      toast.error(
        `Browser blocked all popups. Please allow popups in: ${instructions}`,
        { duration: 7000 }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
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
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">
                      {result.mappedItems.length} item{result.mappedItems.length !== 1 ? 's' : ''} ready for checkout
                    </h3>
                    <p className="text-sm text-green-700 mb-3">
                      These items have been added to your {serviceName} cart
                    </p>
                    <Button
                      onClick={handleOpenCart}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open {serviceName} Cart
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {result.hasUnmappedItems && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900 mb-2">
                      {result.unmappedItems.length} item{result.unmappedItems.length !== 1 ? 's' : ''} need manual search
                    </h3>
                    <p className="text-sm text-orange-700 mb-3">
                      We couldn't find exact matches for these items. Click to search on {serviceName}:
                    </p>

                    <div className="space-y-2 mb-4">
                      {result.unmappedItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-3 bg-white p-3 rounded-md border border-orange-100"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.ingredient}</p>
                            {item.quantity && (
                              <p className="text-sm text-gray-500">
                                {item.quantity} {item.unit || ''}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleSearchItem(item.searchUrl)}
                            variant="outline"
                            size="sm"
                            className="border-orange-300 hover:bg-orange-50 flex-shrink-0"
                          >
                            <Search className="w-4 h-4 mr-1" />
                            Search
                          </Button>
                        </div>
                      ))}
                    </div>

                    {result.unmappedItems.length > 1 && (
                      <Button
                        onClick={handleSearchAllUnmapped}
                        variant="outline"
                        className="w-full border-orange-300 hover:bg-orange-50"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Search All Unmapped Items
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!result.hasCartItems && !result.hasUnmappedItems && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No items to checkout</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-1">About Affiliate Links</h4>
                  <p className="text-sm text-blue-700">
                    We earn a small commission when you purchase through our links, at no extra cost to you.
                    This helps us keep the app free!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
