import { useState, useEffect } from 'react';
import { Package, Truck, ShoppingBag, ExternalLink, Leaf, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  type RoutedItem,
  getServiceDisplayName,
  getCategoryIcon,
  type DeliveryService,
} from '../services/deliveryRoutingService';
import { createInstacartShoppingList, type DeliveryAddress } from '../services/instacartService';
import { trackAmazonServiceClick } from '../services/amazonGroceryService';
import { findProductsForIngredient, bulkAddToCart } from '../services/amazonProductService';
import { createCheckoutResult } from '../services/amazonSearchFallback';
import { supabase } from '../lib/supabase';
import { openInBrowser } from '../lib/deviceDetection';

interface CheckoutProps {
  onNavigate?: (page: string) => void;
}

interface CheckoutData {
  instacartItems: RoutedItem[];
  amazonItems: RoutedItem[];
  amazonFreshItems: RoutedItem[];
  amazonGroceryItems: RoutedItem[];
  wholeFoodsItems: RoutedItem[];
  userId: string;
  deliveryAddress: DeliveryAddress;
}

export function Checkout({ onNavigate }: CheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);

  useEffect(() => {
    const loadCheckoutData = () => {
      const stored = localStorage.getItem('checkout_data');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setCheckoutData(data);
        } catch (error) {
          console.error('Failed to parse checkout data:', error);
          toast.error('Failed to load checkout data');
          onNavigate?.('grocery-list');
        }
      } else {
        toast.error('No checkout data found');
        onNavigate?.('grocery-list');
      }
    };

    loadCheckoutData();
  }, [onNavigate]);

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  const { instacartItems, amazonItems, amazonFreshItems, amazonGroceryItems, wholeFoodsItems, userId, deliveryAddress } = checkoutData;
  const allAmazonItems = [...amazonItems, ...amazonFreshItems, ...amazonGroceryItems, ...wholeFoodsItems];
  const totalItems = instacartItems.length + allAmazonItems.length;

  const handleCheckoutInstacart = async () => {
    if (instacartItems.length === 0) {
      toast.error('No items for Instacart delivery');
      return;
    }

    setLoading(true);
    try {
      toast.info('Creating Instacart shopping list...');

      const shoppingListItems = instacartItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      }));

      const response = await createInstacartShoppingList(shoppingListItems, userId, deliveryAddress);

      await openInBrowser(response.products_link_url);
      toast.success('Instacart opened - add items to cart and checkout!');
    } catch (error) {
      console.error('Error creating Instacart shopping list:', error);
      toast.error('Failed to create Instacart shopping list. Please try again.');
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

      localStorage.setItem('checkout_results', JSON.stringify({ result, serviceName: getServiceDisplayName(serviceType) }));

      onNavigate?.('checkout-results');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-3xl mx-auto p-4 pb-safe">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => onNavigate?.('grocery-list')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Grocery List
          </Button>

          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-6 h-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-gray-900">Choose Delivery Service</h1>
          </div>
          <p className="text-gray-600">
            We've automatically sorted your {totalItems} items by freshness and delivery service
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {instacartItems.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <img src="/instacart_logo_carrot.png" alt="Instacart" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
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

          {instacartItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <img src="/instacart_logo_carrot.png" alt="Instacart" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                    ({instacartItems.length})
                  </span>
                  <Button
                    onClick={handleCheckoutInstacart}
                    disabled={loading}
                    className="font-medium hover:opacity-90 flex items-center"
                    style={{
                      height: '44px',
                      backgroundColor: loading ? '#002920' : '#003D29',
                      color: '#FAF1E5',
                      borderRadius: '22px',
                      paddingLeft: '20px',
                      paddingRight: '20px',
                      border: 'none',
                      gap: '8px',
                    }}
                  >
                    <img
                      src="/instacart_logo_carrot.png"
                      alt="Instacart"
                      style={{
                        width: '36px',
                        height: '36px',
                        objectFit: 'contain',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ whiteSpace: 'nowrap' }}>Shop with Instacart</span>
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
      </div>
    </div>
  );
}
