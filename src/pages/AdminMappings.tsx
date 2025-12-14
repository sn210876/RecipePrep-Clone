import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Search,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  TrendingUp,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import type { AmazonProduct, IngredientMapping } from '../services/amazonProductService';
import { searchProducts } from '../services/amazonProductService';

interface UnmappedIngredient {
  ingredient_name: string;
  count: number;
}

interface MappingWithProduct extends IngredientMapping {
  product: AmazonProduct;
}

export function AdminMappings() {
  const [mappings, setMappings] = useState<MappingWithProduct[]>([]);
  const [unmappedIngredients, setUnmappedIngredients] = useState<UnmappedIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<AmazonProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<AmazonProduct | null>(null);
  const [confidenceScore, setConfidenceScore] = useState(0.8);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadMappings();
      loadUnmappedIngredients();
    }
  }, [isAdmin, searchQuery]);

  useEffect(() => {
    if (productSearch.length >= 2) {
      searchForProducts();
    } else {
      setSearchResults([]);
    }
  }, [productSearch]);

  async function checkAdminStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      toast.error('You do not have admin access');
      setIsAdmin(false);
      return;
    }

    setIsAdmin(true);
  }

  async function loadMappings() {
    setLoading(true);
    try {
      let query = supabase
        .from('ingredient_product_mappings')
        .select(`
          id,
          ingredient_name,
          amazon_product_id,
          confidence_score,
          amazon_products (*)
        `)
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.ilike('ingredient_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappingsWithProducts = (data || [])
        .filter(m => m.amazon_products)
        .map(m => ({
          id: m.id,
          ingredient_name: m.ingredient_name,
          amazon_product_id: m.amazon_product_id,
          confidence_score: m.confidence_score,
          product: m.amazon_products as unknown as AmazonProduct,
        }));

      setMappings(mappingsWithProducts);
    } catch (error) {
      console.error('Failed to load mappings:', error);
      toast.error('Failed to load mappings');
    } finally {
      setLoading(false);
    }
  }

  async function loadUnmappedIngredients() {
    try {
      const { data, error } = await supabase.rpc('get_unmapped_ingredients');

      if (error) {
        const { data: cartItems } = await supabase
          .from('cart_items')
          .select('ingredient_name')
          .is('amazon_product_url', null);

        if (cartItems) {
          const counts = cartItems.reduce((acc, item) => {
            const name = item.ingredient_name.toLowerCase().trim();
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const unmapped = Object.entries(counts)
            .map(([ingredient_name, count]) => ({ ingredient_name, count }))
            .sort((a, b) => b.count - a.count);

          setUnmappedIngredients(unmapped);
        }
        return;
      }

      setUnmappedIngredients(data || []);
    } catch (error) {
      console.error('Failed to load unmapped ingredients:', error);
    }
  }

  async function searchForProducts() {
    if (!productSearch.trim()) return;

    setSearching(true);
    try {
      const results = await searchProducts(productSearch);
      setSearchResults(results);
    } catch (error) {
      console.error('Product search failed:', error);
      toast.error('Failed to search products');
    } finally {
      setSearching(false);
    }
  }

  async function handleCreateMapping() {
    if (!selectedProduct || !selectedIngredient) {
      toast.error('Please select an ingredient and product');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('ingredient_product_mappings')
        .insert({
          ingredient_name: selectedIngredient.toLowerCase().trim(),
          amazon_product_id: selectedProduct.id,
          confidence_score: confidenceScore,
          created_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This mapping already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Mapping created successfully');
      setShowCreateDialog(false);
      setSelectedIngredient('');
      setProductSearch('');
      setSelectedProduct(null);
      setConfidenceScore(0.8);
      loadMappings();
      loadUnmappedIngredients();
    } catch (error) {
      console.error('Failed to create mapping:', error);
      toast.error('Failed to create mapping');
    }
  }

  async function handleDeleteMapping(mappingId: string) {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      const { error } = await supabase
        .from('ingredient_product_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      toast.success('Mapping deleted');
      loadMappings();
      loadUnmappedIngredients();
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      toast.error('Failed to delete mapping');
    }
  }

  async function handleUpdateConfidence(mappingId: string, newScore: number) {
    try {
      const { error } = await supabase
        .from('ingredient_product_mappings')
        .update({ confidence_score: newScore })
        .eq('id', mappingId);

      if (error) throw error;

      toast.success('Confidence score updated');
      loadMappings();
    } catch (error) {
      console.error('Failed to update confidence:', error);
      toast.error('Failed to update confidence');
    }
  }

  function getConfidenceLabel(score: number): string {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  }

  function getConfidenceColor(score: number): string {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-blue-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-gray-600">You do not have admin privileges to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Ingredient Mappings</h1>
        <p className="text-gray-600">Manage ingredient-to-product mappings for better product matching</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Unmapped Ingredients ({unmappedIngredients.length})
            </CardTitle>
            <CardDescription>
              Ingredients requested but not yet mapped to products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unmappedIngredients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>All ingredients are mapped!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {unmappedIngredients.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{item.ingredient_name}</p>
                      <p className="text-sm text-gray-600">Requested {item.count} time{item.count !== 1 ? 's' : ''}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedIngredient(item.ingredient_name);
                        setShowCreateDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Map
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              All Mappings ({mappings.length})
            </CardTitle>
            <CardDescription>
              Existing ingredient-to-product relationships
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              <Input
                placeholder="Search ingredient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              </div>
            ) : mappings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No mappings found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mappings.map(mapping => (
                  <div key={mapping.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium">{mapping.ingredient_name}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          → {mapping.product.product_name}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteMapping(mapping.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <Badge
                        variant="secondary"
                        className={getConfidenceColor(mapping.confidence_score)}
                      >
                        {(mapping.confidence_score * 100).toFixed(0)}% - {getConfidenceLabel(mapping.confidence_score)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Ingredient Mapping</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label htmlFor="ingredient">Ingredient Name</Label>
              <Input
                id="ingredient"
                value={selectedIngredient}
                onChange={(e) => setSelectedIngredient(e.target.value)}
                placeholder="e.g., flour, sugar, milk"
              />
            </div>

            <div>
              <Label htmlFor="product-search">Search for Product</Label>
              <div className="flex gap-2">
                <Input
                  id="product-search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by name, ASIN, brand..."
                />
                {searching && <Loader2 className="w-5 h-5 animate-spin mt-2" />}
              </div>
            </div>

            {searchResults.length > 0 && (
              <div>
                <Label>Select Product</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
                  {searchResults.map(product => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`flex items-center gap-3 p-3 rounded cursor-pointer border-2 transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.product_name}</p>
                        <p className="text-xs text-gray-600">
                          ASIN: {product.asin} • {product.brand || 'No brand'}
                          {product.price && ` • $${product.price.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedProduct && (
              <div>
                <Label>Confidence Score: {(confidenceScore * 100).toFixed(0)}%</Label>
                <Slider
                  value={[confidenceScore * 100]}
                  onValueChange={([value]) => setConfidenceScore(value / 100)}
                  min={50}
                  max={100}
                  step={5}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Low (50%)</span>
                  <span>Medium (70%)</span>
                  <span>High (90%)</span>
                  <span>Perfect (100%)</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateMapping}
              disabled={!selectedProduct || !selectedIngredient}
            >
              Create Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
