import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import {
  Upload,
  Search,
  Trash2,
  Edit,
  Plus,
  Download,
  Package,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { AmazonProduct, ProductCategory } from '../services/amazonProductService';
import { getAllProductCategories } from '../services/amazonProductService';

const AFFILIATE_TAG = 'mealscrape-20';

interface CSVProduct {
  asin: string;
  name: string;
  price?: string;
  image_url?: string;
  category: string;
  keywords?: string;
  brand?: string;
  package_size?: string;
  is_prime?: string;
}

export function AdminProducts() {
  const [activeTab, setActiveTab] = useState('list');
  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const ITEMS_PER_PAGE = 50;

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const [editingProduct, setEditingProduct] = useState<AmazonProduct | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [newProduct, setNewProduct] = useState<Partial<AmazonProduct>>({
    product_name: '',
    category_id: '',
    asin: '',
    price: null,
    brand: '',
    package_size: '',
    description: '',
    image_url: '',
    is_prime: false,
    search_keywords: [],
  });
  const [keywordInput, setKeywordInput] = useState('');

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadCategories();
    loadProducts();
  }, [selectedCategory, searchQuery, currentPage]);

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

  async function loadCategories() {
    try {
      const cats = await getAllProductCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    }
  }

  async function loadProducts() {
    setLoading(true);
    try {
      let query = supabase
        .from('amazon_products')
        .select('*', { count: 'exact' });

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      if (searchQuery.trim()) {
        query = query.or(`product_name.ilike.%${searchQuery}%,asin.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setProducts(data || []);
      setTotalProducts(count || 0);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  function parseCSV(text: string) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('CSV file is empty or invalid');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredFields = ['asin', 'name', 'category'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));

    if (missingFields.length > 0) {
      toast.error(`Missing required CSV columns: ${missingFields.join(', ')}`);
      return;
    }

    const data: CSVProduct[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;

      const product: CSVProduct = {
        asin: '',
        name: '',
        category: '',
      };

      headers.forEach((header, index) => {
        const value = values[index];
        if (header === 'asin') product.asin = value;
        else if (header === 'name') product.name = value;
        else if (header === 'price') product.price = value;
        else if (header === 'image_url') product.image_url = value;
        else if (header === 'category') product.category = value;
        else if (header === 'keywords') product.keywords = value;
        else if (header === 'brand') product.brand = value;
        else if (header === 'package_size') product.package_size = value;
        else if (header === 'is_prime') product.is_prime = value;
      });

      if (product.asin && product.name && product.category) {
        data.push(product);
      }
    }

    if (data.length === 0) {
      toast.error('No valid products found in CSV');
      return;
    }

    setCsvData(data);
    toast.success(`Parsed ${data.length} products from CSV`);
  }

  async function handleBulkImport() {
    if (csvData.length === 0) {
      toast.error('No data to import');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < csvData.length; i++) {
      const product = csvData[i];

      if (!validateASIN(product.asin)) {
        results.failed++;
        results.errors.push(`Invalid ASIN: ${product.asin}`);
        continue;
      }

      try {
        const productData = {
          category_id: product.category,
          product_name: product.name,
          description: '',
          amazon_url: `https://www.amazon.com/dp/${product.asin}?tag=${AFFILIATE_TAG}`,
          asin: product.asin,
          price: product.price ? parseFloat(product.price) : null,
          image_url: product.image_url || null,
          brand: product.brand || null,
          package_size: product.package_size || null,
          is_prime: product.is_prime === 'true' || product.is_prime === '1',
          search_keywords: product.keywords ? product.keywords.split(';').map(k => k.trim()) : [],
          popularity_score: 0,
          is_active: true,
        };

        const { error } = await supabase
          .from('amazon_products')
          .insert(productData);

        if (error) {
          if (error.code === '23505') {
            results.errors.push(`Duplicate ASIN: ${product.asin}`);
          } else {
            results.errors.push(`${product.asin}: ${error.message}`);
          }
          results.failed++;
        } else {
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${product.asin}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      setImportProgress(Math.round(((i + 1) / csvData.length) * 100));
    }

    setImportResult(results);
    setImporting(false);
    toast.success(`Import complete: ${results.success} succeeded, ${results.failed} failed`);
    loadProducts();
  }

  function validateASIN(asin: string): boolean {
    return /^B[A-Z0-9]{9}$/.test(asin);
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('amazon_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product deleted');
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
    }
  }

  async function handleToggleActive(product: AmazonProduct) {
    try {
      const { error } = await supabase
        .from('amazon_products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;

      toast.success(`Product ${!product.is_active ? 'activated' : 'deactivated'}`);
      loadProducts();
    } catch (error) {
      console.error('Failed to toggle product:', error);
      toast.error('Failed to update product');
    }
  }

  async function handleSaveProduct(product: Partial<AmazonProduct>) {
    try {
      const productData = {
        ...product,
        amazon_url: product.asin
          ? `https://www.amazon.com/dp/${product.asin}?tag=${AFFILIATE_TAG}`
          : product.amazon_url,
      };

      const { error } = await supabase
        .from('amazon_products')
        .insert(productData);

      if (error) throw error;

      toast.success('Product added successfully');
      setNewProduct({
        product_name: '',
        category_id: '',
        asin: '',
        price: null,
        brand: '',
        package_size: '',
        description: '',
        image_url: '',
        is_prime: false,
        search_keywords: [],
      });
      setKeywordInput('');
      loadProducts();
    } catch (error) {
      console.error('Failed to add product:', error);
      toast.error('Failed to add product');
    }
  }

  async function handleUpdateProduct() {
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('amazon_products')
        .update({
          product_name: editingProduct.product_name,
          category_id: editingProduct.category_id,
          price: editingProduct.price,
          brand: editingProduct.brand,
          package_size: editingProduct.package_size,
          description: editingProduct.description,
          image_url: editingProduct.image_url,
          is_prime: editingProduct.is_prime,
          search_keywords: editingProduct.search_keywords,
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast.success('Product updated');
      setShowEditDialog(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
      toast.error('Failed to update product');
    }
  }

  function handleBulkDelete() {
    if (selectedProducts.size === 0) {
      toast.error('No products selected');
      return;
    }

    if (!confirm(`Delete ${selectedProducts.size} products?`)) return;

    Promise.all(
      Array.from(selectedProducts).map(id =>
        supabase.from('amazon_products').delete().eq('id', id)
      )
    ).then(() => {
      toast.success(`Deleted ${selectedProducts.size} products`);
      setSelectedProducts(new Set());
      loadProducts();
    }).catch(error => {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete products');
    });
  }

  function downloadSampleCSV() {
    const sample = `asin,name,price,image_url,category,keywords,brand,package_size,is_prime
B001E5E3KG,Gold Medal All-Purpose Flour 5lb,4.99,https://m.media-amazon.com/images/I/example.jpg,baking,flour;baking;all-purpose,Gold Medal,5 lb,true
B00I8G8AKO,Domino Pure Cane Granulated Sugar 4lb,3.99,https://m.media-amazon.com/images/I/example.jpg,baking,sugar;white;granulated,Domino,4 lb,true`;

    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-products.csv';
    a.click();
    URL.revokeObjectURL(url);
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

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Product Management</h1>
        <p className="text-gray-600">Manage Amazon affiliate products and bulk imports</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="list">Product List</TabsTrigger>
          <TabsTrigger value="import">Bulk Import</TabsTrigger>
          <TabsTrigger value="add">Add Single Product</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Products ({totalProducts})</CardTitle>
              <CardDescription>Search, filter, and manage products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, ASIN, or brand..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProducts.size > 0 && (
                <div className="mb-4 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedProducts.size})
                  </Button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No products found</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {products.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedProducts);
                            if (checked) {
                              newSelected.add(product.id);
                            } else {
                              newSelected.delete(product.id);
                            }
                            setSelectedProducts(newSelected);
                          }}
                        />
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium">{product.product_name}</h3>
                          <div className="flex gap-2 mt-1 text-sm text-gray-600">
                            <span>ASIN: {product.asin}</span>
                            {product.price && <span>• ${product.price.toFixed(2)}</span>}
                            {product.brand && <span>• {product.brand}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={product.is_active ? 'default' : 'secondary'}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(product)}
                          >
                            {product.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="py-2 px-4 text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Product Import</CardTitle>
              <CardDescription>Upload a CSV file to import multiple products at once</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Button
                  variant="outline"
                  onClick={downloadSampleCSV}
                  className="mb-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample CSV
                </Button>
                <p className="text-sm text-gray-600 mb-2">
                  Required columns: asin, name, category
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Optional columns: price, image_url, keywords, brand, package_size, is_prime
                </p>

                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={importing}
                />
              </div>

              {csvData.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Preview ({csvData.length} products)</h3>
                  <div className="max-h-64 overflow-y-auto border rounded p-4 space-y-2">
                    {csvData.slice(0, 10).map((product, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-gray-600"> • ASIN: {product.asin}</span>
                        <span className="text-gray-600"> • Category: {product.category}</span>
                      </div>
                    ))}
                    {csvData.length > 10 && (
                      <p className="text-sm text-gray-500">...and {csvData.length - 10} more</p>
                    )}
                  </div>

                  <Button
                    onClick={handleBulkImport}
                    disabled={importing}
                    className="mt-4"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing {importProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import {csvData.length} Products
                      </>
                    )}
                  </Button>
                </div>
              )}

              {importResult && (
                <div className="border rounded p-4 bg-gray-50">
                  <h3 className="font-semibold mb-2">Import Results</h3>
                  <div className="flex gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-600 font-medium">
                        {importResult.success} succeeded
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-red-600 font-medium">
                        {importResult.failed} failed
                      </span>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="max-h-48 overflow-y-auto">
                      <p className="font-medium text-sm mb-2">Errors:</p>
                      {importResult.errors.map((error, idx) => (
                        <p key={idx} className="text-sm text-red-600">• {error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add Single Product</CardTitle>
              <CardDescription>Manually add a new product to the catalog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="asin">ASIN *</Label>
                  <Input
                    id="asin"
                    value={newProduct.asin || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, asin: e.target.value })}
                    placeholder="B001E5E3KG"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={newProduct.product_name || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                    placeholder="Gold Medal All-Purpose Flour"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={newProduct.category_id || ''}
                    onValueChange={(value) => setNewProduct({ ...newProduct, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newProduct.price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || null })}
                    placeholder="4.99"
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={newProduct.brand || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    placeholder="Gold Medal"
                  />
                </div>
                <div>
                  <Label htmlFor="package_size">Package Size</Label>
                  <Input
                    id="package_size"
                    value={newProduct.package_size || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, package_size: e.target.value })}
                    placeholder="5 lb"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={newProduct.image_url || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  placeholder="https://m.media-amazon.com/images/I/..."
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProduct.description || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Product description..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Keywords</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Enter keyword and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && keywordInput.trim()) {
                        e.preventDefault();
                        setNewProduct({
                          ...newProduct,
                          search_keywords: [...(newProduct.search_keywords || []), keywordInput.trim()],
                        });
                        setKeywordInput('');
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {newProduct.search_keywords?.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => {
                        setNewProduct({
                          ...newProduct,
                          search_keywords: newProduct.search_keywords?.filter((_, i) => i !== idx),
                        });
                      }}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_prime"
                  checked={newProduct.is_prime || false}
                  onCheckedChange={(checked) => setNewProduct({ ...newProduct, is_prime: Boolean(checked) })}
                />
                <Label htmlFor="is_prime">Amazon Prime eligible</Label>
              </div>

              <Button
                onClick={() => handleSaveProduct(newProduct)}
                disabled={!newProduct.asin || !newProduct.product_name || !newProduct.category_id}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div>
                <Label>Product Name</Label>
                <Input
                  value={editingProduct.product_name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, product_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={editingProduct.category_id}
                  onValueChange={(value) => setEditingProduct({ ...editingProduct, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || null })}
                  />
                </div>
                <div>
                  <Label>Brand</Label>
                  <Input
                    value={editingProduct.brand || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateProduct}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
