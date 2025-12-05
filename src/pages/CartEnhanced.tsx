import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ShoppingCart, Trash2, Plus, Minus, ExternalLink, CreditCard, Search, Package, Store } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllProductCategories,
  searchProducts,
  getProductsByCategory,
  addProductToCart,
  appendAffiliateTag,
  type AmazonProduct,
  type ProductCategory,
} from '../services/amazonProductService';

interface CartItem {
  id: string;
  ingredient_name: string;
  quantity: string;
  unit: string;
  amazon_product_url: string | null;
  amazon_product_name: string | null;
  price: number | null;
  image_url: string | null;
  asin: string | null;
  source_recipe_id: string | null;
}

interface CartProps {
  onNavigate?: (page: string) => void;
}

export function Cart({ onNavigate }: CartProps = {}) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(true);

  useEffect(() => {
    loadCart();
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery]);

  const loadCart = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      setUserId(userData.user.id);

      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false});

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('Error loading cart:', error);
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getAllProductCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      let data: AmazonProduct[];

      if (searchQuery.trim()) {
        data = await searchProducts(
          searchQuery,
          selectedCategory === 'all' ? undefined : selectedCategory
        );
      } else if (selectedCategory !== 'all') {
        data = await getProductsByCategory(selectedCategory);
      } else {
        const { data: allProducts, error } = await supabase
          .from('amazon_products')
          .select('*')
          .eq('is_active', true)
          .order('popularity_score', { ascending: false })
          .limit(24);

        if (error) throw error;
        data = allProducts || [];
      }

      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleAddProductToCart = async (product: AmazonProduct) => {
    if (!userId) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    try {
      await addProductToCart(userId, product, '1', product.package_size || '');
      await loadCart();
      toast.success(`Added ${product.product_name} to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
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
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const itemsWithAsin = cartItems.filter(item => item.asin);
    const itemsWithoutAsin = cartItems.filter(item => !item.asin && item.amazon_product_url);

    if (itemsWithAsin.length > 0) {
      const cartUrl = buildAmazonCartUrl(itemsWithAsin);
      window.open(cartUrl, '_blank');

      if (itemsWithoutAsin.length > 0) {
        toast.success(`Added ${itemsWithAsin.length} items to Amazon cart. Opening ${itemsWithoutAsin.length} additional items...`);
        itemsWithoutAsin.forEach((item, index) => {
          setTimeout(() => {
            window.open(appendAffiliateTag(item.amazon_product_url!), '_blank');
          }, (index + 1) * 300);
        });
      } else {
        toast.success(`Added ${itemsWithAsin.length} items to Amazon cart!`);
      }
    } else if (itemsWithoutAsin.length > 0) {
      itemsWithoutAsin.forEach((item, index) => {
        setTimeout(() => {
          window.open(appendAffiliateTag(item.amazon_product_url!), '_blank');
        }, index * 300);
      });
      toast.success('Opening Amazon product pages...');
    } else {
      toast.error('No Amazon products in cart');
    }
  };

  const buildAmazonCartUrl = (items: CartItem[]): string => {
    const AFFILIATE_TAG = 'mealscrape-20';
    const baseUrl = 'https://www.amazon.com/gp/aws/cart/add.html';
    const params = new URLSearchParams();

    items.forEach((item, index) => {
      const itemNum = index + 1;
      params.append(`ASIN.${itemNum}`, item.asin!);
      const quantity = parseInt(item.quantity) || 1;
      params.append(`Quantity.${itemNum}`, quantity.toString());
    });

    params.append('tag', AFFILIATE_TAG);
    return `${baseUrl}?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 pb-32">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Product Catalog Section */}
        <Card className="mb-6 border-2 border-orange-200">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 text-center">
  <div>
    <CardTitle className="text-lg sm:text-xl mb-2">Amazon Product Catalog</CardTitle>
    <p className="text-sm text-gray-600 mb-3">Browse and add pantry staples to your cart</p>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowCatalog(!showCatalog)}
      className="w-full sm:w-auto"
    >
      {showCatalog ? 'Hide' : 'Show'} Catalog
    </Button>
  </div>
</CardHeader>

          {showCatalog && (
            <CardContent className="pt-6">
              {/* Search and Filter */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Products Grid */}
              {productsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No products found. Try a different search or category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map(product => (
                    <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                      <div className="aspect-square bg-gray-100 flex items-center justify-center p-4">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="w-16 h-16 text-gray-300" />
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1 min-h-[2.5rem]">
                          {product.product_name}
                        </h3>
                        {product.brand && (
                          <p className="text-xs text-gray-500 mb-2">{product.brand}</p>
                        )}
                        {product.package_size && (
                          <Badge variant="secondary" className="text-xs mb-2">
                            {product.package_size}
                          </Badge>
                        )}
                        {product.price && (
                          <p className="text-lg font-bold text-orange-600 mb-2">
                            ${product.price.toFixed(2)}
                          </p>
                        )}
                        {product.is_prime && (
                          <Badge className="bg-blue-500 text-white text-xs mb-2">
                            Prime
                          </Badge>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={() => handleAddProductToCart(product)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a
                              href={appendAffiliateTag(product.amazon_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Cart Items Section */}
        {cartItems.length === 0 ? (
          <Card className="w-full max-w-sm mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12 px-6">
              <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center mb-4 text-sm md:text-base">
                Your cart is empty. Browse products above or add items from your meal planner!
              </p>
              <Button
                onClick={() => onNavigate?.('meal-planner')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Go to Meal Planner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Your Cart</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-xs md:text-sm hover:bg-red-50 hover:text-red-600"
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-3 md:space-y-4 mb-6">
              {cartItems.map(item => (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex gap-3 md:gap-4">
                      {item.image_url && (
                        <div className="shrink-0">
                          <img
                            src={item.image_url}
                            alt={item.amazon_product_name || item.ingredient_name}
                            className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg bg-slate-100"
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-lg text-slate-900 line-clamp-2 mb-1">
                          {item.amazon_product_name || item.ingredient_name}
                        </h3>

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

                        <div className="flex gap-1 flex-col">
                          {item.amazon_product_url && (
                            <a
                              href={appendAffiliateTag(item.amazon_product_url)}
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
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary and Checkout */}
            <div className="max-w-4xl mx-auto">
              <Card className="mb-4 bg-slate-50 border-slate-200">
                <CardContent className="p-4 md:p-6">
                  <div className="space-y-2 text-sm md:text-base">
                    <div className="flex justify-between text-slate-700">
                      <span>Subtotal ({cartItems.length} items)</span>
                      <span className="font-medium">${getTotalPrice().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-xs md:text-sm">
                      <span>Prices from Amazon • Shipping & taxes calculated at checkout</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="fixed bottom-[80px] lg:relative lg:bottom-0 left-0 right-0 z-[150] lg:z-10 pointer-events-none">
               <div className="max-w-4xl mx-auto px-4 py-3 pointer-events-auto flex flex-col items-center">
  <Button
    className="w-auto bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold h-12 md:h-14 shadow-lg rounded-full transition-all transform active:scale-95 px-6"
    size="lg"
    onClick={handleCheckout}
  >
    <CreditCard className="w-5 h-5 mr-2" />
    Send To Amazon Cart
  </Button>
  <p className="text-xs text-center text-gray-500 mt-2">
   </p>
</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
