import { useState, useEffect } from 'react';
import { Package, Truck, ShoppingBag, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  type RoutedItem,
  getServiceBadgeColor,
  getServiceDisplayName,
  getCategoryIcon,
} from '../services/deliveryRoutingService';
import { createInstacartCart, type DeliveryAddress } from '../services/instacartService';

interface DeliveryServiceSelectorProps {
  instacartItems: RoutedItem[];
  amazonItems: RoutedItem[];
  userId: string;
  deliveryAddress: DeliveryAddress;
  onClose: () => void;
}

export function DeliveryServiceSelector({
  instacartItems,
  amazonItems,
  userId,
  deliveryAddress,
  onClose,
}: DeliveryServiceSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<'instacart' | 'amazon' | null>(null);
  const [showSummary, setShowSummary] = useState(true);

  const totalItems = instacartItems.length + amazonItems.length;

  const handleCheckoutInstacart = async () => {
    if (instacartItems.length === 0) {
      toast.error('No items for Instacart delivery');
      return;
    }

    setLoading(true);
    try {
      const cartItems = instacartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit: item.unit,
      }));

      const session = await createInstacartCart(cartItems, userId, deliveryAddress);

      window.open(session.checkout_url, '_blank');
      toast.success('Redirecting to Instacart checkout...');
    } catch (error) {
      console.error('Error creating Instacart cart:', error);
      toast.error('Failed to create Instacart cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutAmazon = async () => {
    if (amazonItems.length === 0) {
      toast.error('No items for Amazon delivery');
      return;
    }

    setLoading(true);
    try {
      toast.info('Opening Amazon affiliate link...');
      window.open('https://www.amazon.com/cart?tag=mealscrape-20', '_blank');
      toast.success('Redirected to Amazon');
    } catch (error) {
      console.error('Error opening Amazon:', error);
      toast.error('Failed to open Amazon');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutBoth = async () => {
    await handleCheckoutInstacart();
    await handleCheckoutAmazon();
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Choose Delivery Service
          </DialogTitle>
          <DialogDescription>
            We've automatically sorted your {totalItems} items by freshness and delivery service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showSummary && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-green-600" />
                    Instacart Fresh
                  </CardTitle>
                  <CardDescription>Fresh produce, meat, dairy</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {instacartItems.length}
                  </div>
                  <div className="text-xs text-muted-foreground">items</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-600" />
                    Amazon Pantry
                  </CardTitle>
                  <CardDescription>Packaged goods, staples</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {amazonItems.length}
                  </div>
                  <div className="text-xs text-muted-foreground">items</div>
                </CardContent>
              </Card>
            </div>
          )}

          {instacartItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-green-600" />
                    Instacart Items ({instacartItems.length})
                  </span>
                  <Button
                    size="sm"
                    onClick={handleCheckoutInstacart}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Checkout
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {instacartItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-green-50"
                    >
                      <div className="flex items-center gap-2">
                        <span>{getCategoryIcon(item.category)}</span>
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.quantity} {item.unit}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {amazonItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-600" />
                    Amazon Items ({amazonItems.length})
                  </span>
                  <Button
                    size="sm"
                    onClick={handleCheckoutAmazon}
                    disabled={loading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Checkout
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {amazonItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-orange-50"
                    >
                      <div className="flex items-center gap-2">
                        <span>{getCategoryIcon(item.category)}</span>
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.quantity} {item.unit}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {instacartItems.length > 0 && amazonItems.length > 0 && (
            <Button onClick={handleCheckoutBoth} disabled={loading}>
              <Truck className="w-4 h-4 mr-2" />
              Checkout Both
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
