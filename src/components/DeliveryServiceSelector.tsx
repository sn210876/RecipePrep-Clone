import { useState, useEffect } from 'react';
import { Package, Truck, ShoppingBag, ExternalLink, Leaf } from 'lucide-react';
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
  type DeliveryService,
} from '../services/deliveryRoutingService';
import { createInstacartCart, type DeliveryAddress } from '../services/instacartService';
import {
  buildAmazonDeepLink,
  trackAmazonServiceClick,
  getServiceColor,
  getServiceBackgroundColor,
} from '../services/amazonGroceryService';
import { findProductsForIngredient, bulkAddToCart } from '../services/amazonProductService';

interface DeliveryServiceSelectorProps {
  instacartItems: RoutedItem[];
  amazonItems: RoutedItem[];
  amazonFreshItems?: RoutedItem[];
  amazonGroceryItems?: RoutedItem[];
  wholeFoodsItems?: RoutedItem[];
  userId: string;
  deliveryAddress: DeliveryAddress;
  onClose: () => void;
}

export function DeliveryServiceSelector({
  instacartItems,
  amazonItems,
  amazonFreshItems = [],
  amazonGroceryItems = [],
  wholeFoodsItems = [],
  userId,
  deliveryAddress,
  onClose,
}: DeliveryServiceSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<DeliveryService | null>(null);
  const [showSummary, setShowSummary] = useState(true);

  const allAmazonItems = [
    ...amazonItems,
    ...amazonFreshItems,
    ...amazonGroceryItems,
    ...wholeFoodsItems,
  ];
  const totalItems = instacartItems.length + allAmazonItems.length;

  const handleCheckoutInstacart = async () => {
    if (instacartItems.length === 0) {
      toast.error('No items for Instacart delivery');
      return;
    }

    setLoading(true);
    try {
      toast.info('Finding matching products for Instacart...');

      const itemsToAdd = [];
      for (const item of instacartItems) {
        const products = await findProductsForIngredient(item.name, 1);
        if (products.length > 0) {
          itemsToAdd.push({
            product: products[0],
            quantity: item.quantity.toString(),
            unit: item.unit,
            deliveryService: 'instacart' as DeliveryService,
          });
        }
      }

      if (itemsToAdd.length > 0) {
        await bulkAddToCart(userId, itemsToAdd);
        toast.success(`Added ${itemsToAdd.length} items to cart for Instacart`);
      }

      const cartItems = instacartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit: item.unit,
      }));

      const session = await createInstacartCart(cartItems, userId, deliveryAddress);

      window.open(session.checkout_url, '_blank');
      toast.success('Redirecting to Instacart checkout...');

      onClose();
    } catch (error) {
      console.error('Error creating Instacart cart:', error);
      toast.error('Failed to create Instacart cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutAmazon = async (serviceType: DeliveryService, items: RoutedItem[]) => {
    if (items.length === 0) {
      toast.error(`No items for ${getServiceDisplayName(serviceType)}`);
      return;
    }

    setLoading(true);
    try {
      toast.info('Finding matching Amazon products...');

      const itemsToAdd = [];
      for (const item of items) {
        const products = await findProductsForIngredient(item.name, 1);
        if (products.length > 0) {
          itemsToAdd.push({
            product: products[0],
            quantity: item.quantity.toString(),
            unit: item.unit,
            deliveryService: serviceType,
          });
        }
      }

      if (itemsToAdd.length === 0) {
        toast.error('No matching Amazon products found');
        return;
      }

      const addedItems = await bulkAddToCart(userId, itemsToAdd);

      await trackAmazonServiceClick(userId, serviceType, addedItems.length);

      toast.success(`Added ${addedItems.length} items to cart for ${getServiceDisplayName(serviceType)}`);

      const skippedCount = items.length - addedItems.length;
      if (skippedCount > 0) {
        toast.info(`${skippedCount} item${skippedCount !== 1 ? 's' : ''} skipped (no matching products)`);
      }

      const deepLink = buildAmazonDeepLink(serviceType);
      window.open(deepLink, '_blank');

      onClose();
    } catch (error) {
      console.error(`Error processing ${serviceType}:`, error);
      toast.error(`Failed to add items to cart`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutAll = async () => {
    if (instacartItems.length > 0) {
      await handleCheckoutInstacart();
    }

    if (amazonFreshItems.length > 0) {
      await handleCheckoutAmazon('amazon_fresh', amazonFreshItems);
    }

    if (amazonGroceryItems.length > 0) {
      await handleCheckoutAmazon('amazon_grocery', amazonGroceryItems);
    }

    if (wholeFoodsItems.length > 0) {
      await handleCheckoutAmazon('whole_foods', wholeFoodsItems);
    }

    if (amazonItems.length > 0) {
      await handleCheckoutAmazon('amazon', amazonItems);
    }

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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {instacartItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-green-600" />
                      Instacart
                    </CardTitle>
                    <CardDescription>Quick delivery</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {instacartItems.length}
                    </div>
                    <div className="text-xs text-muted-foreground">items</div>
                  </CardContent>
                </Card>
              )}

              {amazonFreshItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-green-600" />
                      Amazon Fresh
                    </CardTitle>
                    <CardDescription>Same-day delivery</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {amazonFreshItems.length}
                    </div>
                    <div className="text-xs text-muted-foreground">items</div>
                  </CardContent>
                </Card>
              )}

              {amazonGroceryItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      Amazon Grocery
                    </CardTitle>
                    <CardDescription>Standard shipping</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {amazonGroceryItems.length}
                    </div>
                    <div className="text-xs text-muted-foreground">items</div>
                  </CardContent>
                </Card>
              )}

              {wholeFoodsItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      Whole Foods
                    </CardTitle>
                    <CardDescription>Premium organic</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">
                      {wholeFoodsItems.length}
                    </div>
                    <div className="text-xs text-muted-foreground">items</div>
                  </CardContent>
                </Card>
              )}

              {amazonItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      Amazon
                    </CardTitle>
                    <CardDescription>General items</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {amazonItems.length}
                    </div>
                    <div className="text-xs text-muted-foreground">items</div>
                  </CardContent>
                </Card>
              )}
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

          {amazonFreshItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-600" />
                    Amazon Fresh ({amazonFreshItems.length})
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleCheckoutAmazon('amazon_fresh', amazonFreshItems)}
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
                  {amazonFreshItems.map(item => (
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

          {amazonGroceryItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-600" />
                    Amazon Grocery ({amazonGroceryItems.length})
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleCheckoutAmazon('amazon_grocery', amazonGroceryItems)}
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
                  {amazonGroceryItems.map(item => (
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

          {wholeFoodsItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    Whole Foods ({wholeFoodsItems.length})
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleCheckoutAmazon('whole_foods', wholeFoodsItems)}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Checkout
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {wholeFoodsItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-emerald-50"
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
                    Amazon ({amazonItems.length})
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleCheckoutAmazon('amazon', amazonItems)}
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
          {(instacartItems.length + allAmazonItems.length) > 1 && (
            <Button onClick={handleCheckoutAll} disabled={loading}>
              <Truck className="w-4 h-4 mr-2" />
              Checkout All Services
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
