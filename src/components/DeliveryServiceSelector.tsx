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
import { createCheckoutResult, type CheckoutResult } from '../services/amazonSearchFallback';
import { CheckoutResultsDialog } from './CheckoutResultsDialog';

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
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [preventClose, setPreventClose] = useState(false);

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

      const itemsWithProducts: Array<{ name: string; quantity: string; unit: string; asin: string | null }> = [];
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
          itemsWithProducts.push({
            name: item.name,
            quantity: item.quantity.toString(),
            unit: item.unit,
            asin: products[0].asin,
          });
        } else {
          itemsWithProducts.push({
            name: item.name,
            quantity: item.quantity.toString(),
            unit: item.unit,
            asin: null,
          });
        }
      }

      if (itemsToAdd.length > 0) {
        await bulkAddToCart(userId, itemsToAdd);
      }

      await trackAmazonServiceClick(userId, serviceType, itemsToAdd.length);

      const result = createCheckoutResult(itemsWithProducts, serviceType);
      setCheckoutResult(result);
      setShowResultsDialog(true);

      if (result.hasCartItems && !result.hasUnmappedItems) {
        toast.success(`Added ${result.mappedItems.length} items to ${getServiceDisplayName(serviceType)} cart`);
      } else if (result.hasCartItems && result.hasUnmappedItems) {
        toast.info(`${result.mappedItems.length} items ready, ${result.unmappedItems.length} need manual search`);
      } else if (result.hasUnmappedItems) {
        toast.info(`${result.unmappedItems.length} items need manual search on Amazon`);
      }
    } catch (error) {
      console.error(`Error processing ${serviceType}:`, error);
      toast.error(`Failed to process items`);
    } finally {
      setLoading(false);
    }
  };

  const buildAmazonCartUrl = (items: any[]): string => {
    const AFFILIATE_TAG = 'mealscrape-20';
    const baseUrl = 'https://www.amazon.com/gp/aws/cart/add.html';
    const params = new URLSearchParams();

    items.forEach((item, index) => {
      const itemNum = index + 1;
      params.append(`ASIN.${itemNum}`, item.asin);
      const quantity = parseInt(item.quantity) || 1;
      params.append(`Quantity.${itemNum}`, quantity.toString());
    });

    params.append('tag', AFFILIATE_TAG);
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <>
      <CheckoutResultsDialog
        open={showResultsDialog}
        onClose={() => {
          setShowResultsDialog(false);
          onClose();
        }}
        result={checkoutResult}
        serviceName={selectedService ? getServiceDisplayName(selectedService) : 'Amazon'}
      />
      <Dialog
        open={!showResultsDialog}
        onOpenChange={(open) => {
          if (!open && !preventClose) {
            onClose();
          }
        }}
        modal={true}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
        >
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
                    onClick={() => {
                      setSelectedService('amazon_fresh');
                      handleCheckoutAmazon('amazon_fresh', amazonFreshItems);
                    }}
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
                    onClick={() => {
                      setSelectedService('amazon_grocery');
                      handleCheckoutAmazon('amazon_grocery', amazonGroceryItems);
                    }}
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
                    onClick={() => {
                      setSelectedService('whole_foods');
                      handleCheckoutAmazon('whole_foods', wholeFoodsItems);
                    }}
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
                    onClick={() => {
                      setSelectedService('amazon');
                      handleCheckoutAmazon('amazon', amazonItems);
                    }}
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setPreventClose(false);
              setTimeout(() => onClose(), 0);
            }}
            disabled={loading}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

        
          
