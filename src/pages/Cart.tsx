import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ShoppingCart, Trash2, Plus, Minus, ExternalLink, CreditCard, Package, Leaf, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { getServiceDisplayName, type DeliveryService } from '../services/deliveryRoutingService';
import { buildAmazonDeepLink } from '../services/amazonGroceryService';

interface CartItem {
  id: string;
  ingredient_name: string;
  quantity: string;
  unit: string;
  amazon_product_url: string | null;
  amazon_product_name: string | null;
  price: number | null;
  image_url: string | null;
  source_recipe_id: string | null;
  delivery_service: string | null;
}

interface CartProps {
  onNavigate?: (page: string) => void;
}

export function Cart({ onNavigate }: CartProps = {}) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      setUserId(userData.user.id);

      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('Error loading cart:', error);
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(items =>
        items.map(item => (item.id === itemId ? { ...item, quantity: newQuantity } : item))
      );
      toast.success('Quantity updated');
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from('cart_items').delete().eq('id', itemId);

      if (error) throw error;

      setCartItems(items => items.filter(item => item.id !== itemId));
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    }
  };

  const clearCart = async () => {
    if (!userId) return;
    if (!confirm('Are you sure you want to clear your entire cart?')) return;

    try {
      const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);

      if (error) throw error;

      setCartItems([]);
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.price || 0;
      const quantity = parseFloat(item.quantity) || 1;
      return sum + price * quantity;
    }, 0);
  };

  const handleCheckout = () => {
    toast.info('Stripe checkout coming soon!');
  };

  const groupItemsByService = () => {
    const grouped: Record<string, CartItem[]> = {};

    cartItems.forEach(item => {
      const service = item.delivery_service || 'general';
      if (!grouped[service]) {
        grouped[service] = [];
      }
      grouped[service].push(item);
    });

    return grouped;
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'amazon_fresh':
        return <Leaf className="w-4 h-4 text-green-600" />;
      case 'amazon_grocery':
        return <Package className="w-4 h-4 text-orange-600" />;
      case 'whole_foods':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'instacart':
        return <img src="/instacart_logo_kale.png" alt="Instacart" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />;
      case 'amazon':
        return <Package className="w-4 h-4 text-orange-600" />;
      default:
        return <ShoppingCart className="w-4 h-4 text-gray-600" />;
    }
  };

  const getServiceBadgeColor = (service: string) => {
    switch (service) {
      case 'amazon_fresh':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'amazon_grocery':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'whole_foods':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'instacart':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'amazon':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleServiceCheckout = (service: string, items: CartItem[]) => {
    if (service === 'general') {
      toast.info('Add items from delivery services to checkout');
      return;
    }

    const deepLink = buildAmazonDeepLink(service as DeliveryService);
    window.open(deepLink, '_blank');
    toast.success(`Opening ${getServiceDisplayName(service as DeliveryService)} with ${items.length} items in your cart`);
  };

  const groupedItems = groupItemsByService();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {cartItems.length === 0 ? (
        <div className="p-4 md:p-6 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 px-6">
              <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center mb-4 text-sm md:text-base">
                Your cart is empty. Soon you will be able to order your ingredients and get them delivered!
              </p>
              <Button 
                onClick={() => onNavigate?.('meal-planner')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Add Items from Meal Planner
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-4 md:p-6 pb-32 md:pb-24">
          {/* Header inside content area */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearCart}
                className="text-xs md:text-sm hover:bg-red-50 hover:text-red-600"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Cart Items Grouped by Service */}
          <div className="space-y-6 mb-6 max-w-4xl mx-auto">
            {Object.entries(groupedItems).map(([service, items]) => {
              const serviceName = service === 'general'
                ? 'General Items'
                : getServiceDisplayName(service as DeliveryService);

              return (
                <Card key={service} className="overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getServiceIcon(service)}
                        <CardTitle className="text-base md:text-lg">{serviceName}</CardTitle>
                        <Badge variant="outline" className={getServiceBadgeColor(service)}>
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </Badge>
                      </div>
                      {service !== 'general' && (
                        service === 'instacart' ? (
                          <Button
                            onClick={() => handleServiceCheckout(service, items)}
                            className="font-medium hover:opacity-90 flex items-center"
                            style={{
                              height: '44px',
                              backgroundColor: '#003D29',
                              color: '#FAF1E5',
                              borderRadius: '22px',
                              paddingLeft: '20px',
                              paddingRight: '20px',
                              border: 'none',
                              gap: '8px',
                            }}
                          >
                            <img
                              src="/instacart_logo_kale.png"
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
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleServiceCheckout(service, items)}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                           Checkout
                          </Button>
                        )
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {items.map(item => (
                        <div key={item.id} className="p-3 md:p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex gap-3 md:gap-4">
                            {/* Image */}
                            {item.image_url && (
                              <div className="shrink-0">
                                <img
                                  src={item.image_url}
                                  alt={item.amazon_product_name || item.ingredient_name}
                                  className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg bg-slate-100"
                                />
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm md:text-lg text-slate-900 line-clamp-2 mb-1">
                                {item.amazon_product_name || item.ingredient_name}
                              </h3>
                              {item.ingredient_name !== item.amazon_product_name && (
                                <p className="text-xs md:text-sm text-gray-600 italic mb-2 line-clamp-1">
                                  {item.ingredient_name}
                                </p>
                              )}

                              {/* Quantity Controls */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <div className="flex items-center gap-2 bg-slate-100 rounded-lg w-fit p-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const current = parseFloat(item.quantity) || 1;
                                      if (current > 1) {
                                        updateQuantity(item.id, (current - 1).toString());
                                      }
                                    }}
                                    className="h-7 w-7 p-0 hover:bg-slate-200"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <Input
                                    type="text"
                                    value={item.quantity}
                                    onChange={e => updateQuantity(item.id, e.target.value)}
                                    className="w-12 md:w-16 text-center text-sm h-7 border-0 bg-transparent"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const current = parseFloat(item.quantity) || 1;
                                      updateQuantity(item.id, (current + 1).toString());
                                    }}
                                    className="h-7 w-7 p-0 hover:bg-slate-200"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                <span className="text-xs md:text-sm text-gray-600">{item.unit}</span>
                              </div>
                            </div>

                            {/* Price & Actions */}
                            <div className="flex flex-col items-end gap-2 justify-between">
                              {item.price && (
                                <div className="text-right">
                                  <div className="text-sm md:text-lg font-semibold text-orange-600">
                                    ${(item.price * (parseFloat(item.quantity) || 1)).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ${item.price.toFixed(2)} each
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-1 flex-col">
                                {item.amazon_product_url && (
                                  <a
                                    href={item.amazon_product_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1 text-xs md:text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span className="hidden sm:inline">View</span>
                                  </a>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs md:text-sm h-7 px-2"
                                >
                                  <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                  <span className="hidden sm:inline">Remove</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary Section */}
          <div className="max-w-4xl mx-auto">
            {/* Item Count & Subtotal */}
            <Card className="mb-4 bg-slate-50 border-slate-200">
              <CardContent className="p-4 md:p-6">
                <div className="space-y-2 text-sm md:text-base">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium">${getTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-xs md:text-sm">
                    <span>Shipping & taxes calculated at checkout</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checkout Button - Fixed footer on mobile (above nav), sticky on desktop */}
            <div className="fixed bottom-[80px] lg:relative lg:bottom-0 left-0 right-0 z-[150] lg:z-10 pointer-events-none">
              <div className="max-w-4xl mx-auto px-4 py-3 pointer-events-auto">
                <Button
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold h-12 md:h-14 shadow-lg rounded-full transition-all transform active:scale-95"
                  size="lg"
                  onClick={handleCheckout}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </Button>
                <p className="text-xs text-center text-gray-500 mt-2">
                  Stripe checkout integration coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}