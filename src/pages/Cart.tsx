import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ShoppingCart, Trash2, Plus, Minus, ExternalLink, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold">Your Cart</h1>
        </div>
        {cartItems.length > 0 && (
          <Button variant="outline" onClick={clearCart}>
            Clear Cart
          </Button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-4">COMING SOON....</p>
            <Button onClick={() => onNavigate?.('meal-planner')}>
              Add items from Meal Planner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {cartItems.map(item => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.amazon_product_name || item.ingredient_name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {item.amazon_product_name || item.ingredient_name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {item.ingredient_name !== item.amazon_product_name && (
                          <span className="italic">{item.ingredient_name}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const current = parseFloat(item.quantity) || 1;
                              if (current > 1) {
                                updateQuantity(item.id, (current - 1).toString());
                              }
                            }}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="text"
                            value={item.quantity}
                            onChange={e => updateQuantity(item.id, e.target.value)}
                            className="w-16 text-center"
                          />
                          <span className="text-sm text-gray-600">{item.unit}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const current = parseFloat(item.quantity) || 1;
                              updateQuantity(item.id, (current + 1).toString());
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        {item.price && (
                          <div className="text-lg font-semibold text-orange-600">
                            ${(item.price * (parseFloat(item.quantity) || 1)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {item.amazon_product_url && (
                        <a
                          href={item.amazon_product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on Amazon
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="sticky bottom-20 bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl font-semibold">Total:</span>
                <span className="text-3xl font-bold text-orange-600">
                  ${getTotalPrice().toFixed(2)}
                </span>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                size="lg"
                onClick={handleCheckout}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Proceed to Checkout
              </Button>
              <p className="text-xs text-center text-gray-500 mt-2">
                Stripe checkout integration coming soon
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
