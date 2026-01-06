import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Package, ExternalLink, Check } from 'lucide-react';
import { findProductsForIngredient, type AmazonProduct, appendAffiliateTag } from '../services/amazonProductService';
import { toast } from 'sonner';
a
interface ProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientName: string;
  quantity: string;
  unit: string;
  onSelect: (product: AmazonProduct) => void;
}

export function ProductSelectorDialog({
  open,
  onOpenChange,
  ingredientName,
  quantity,
  unit,
  onSelect,
}: ProductSelectorDialogProps) {
  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AmazonProduct | null>(null);

  useEffect(() => {
    if (open && ingredientName) {
      loadProducts();
    }
  }, [open, ingredientName]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await findProductsForIngredient(ingredientName, 5);
      setProducts(data);
      if (data.length === 0) {
        toast.info('No exact matches found. Showing general results.');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load product suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedProduct) {
      onSelect(selectedProduct);
      onOpenChange(false);
      setSelectedProduct(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Select Product for "{ingredientName}"</DialogTitle>
          <DialogDescription>
            Choose an Amazon product to add to your cart ({quantity} {unit})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="mb-2">No products found for "{ingredientName}"</p>
              <p className="text-sm">Try browsing the product catalog in the Cart page</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProduct?.id === product.id
                      ? 'border-2 border-orange-500 bg-orange-50'
                      : 'border border-gray-200'
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <Package className="w-12 h-12 text-gray-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm line-clamp-2">
                            {product.product_name}
                          </h3>
                          {selectedProduct?.id === product.id && (
                            <Check className="w-5 h-5 text-orange-600 shrink-0" />
                          )}
                        </div>

                        {product.brand && (
                          <p className="text-xs text-gray-600 mb-1">{product.brand}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {product.package_size && (
                            <Badge variant="secondary" className="text-xs">
                              {product.package_size}
                            </Badge>
                          )}
                          {product.is_prime && (
                            <Badge className="bg-blue-500 text-white text-xs">
                              Prime
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          {product.price && (
                            <p className="text-lg font-bold text-orange-600">
                              ${product.price.toFixed(2)}
                            </p>
                          )}
                          <a
                            href={appendAffiliateTag(product.amazon_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>View on Amazon</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedProduct(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedProduct}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
