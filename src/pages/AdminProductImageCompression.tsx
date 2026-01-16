import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, Image as ImageIcon, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';

interface CompressionResult {
  productId: string;
  productName: string;
  originalUrl: string;
  newUrl?: string;
  originalSize?: number;
  compressedSize?: number;
  savings?: number;
  success: boolean;
  error?: string;
}

export default function AdminProductImageCompression() {
  const { isAdmin } = useAuth();
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CompressionResult[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  async function downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return await response.blob();
  }

  async function compressImage(blob: Blob): Promise<Blob> {
    const file = new File([blob], 'image.jpg', { type: blob.type });

    const options = {
      maxSizeMB: blob.size / 1024 / 1024 / 4,
      useWebWorker: true,
      maxIteration: 10,
      fileType: blob.type,
      preserveExif: false,
    };

    try {
      const compressed = await imageCompression(file, options);
      return compressed;
    } catch (error) {
      console.error('Compression error:', error);
      throw error;
    }
  }

  async function uploadToSupabase(blob: Blob, productId: string): Promise<string> {
    const fileName = `amazon-products/${productId}-${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  async function processProduct(product: any): Promise<CompressionResult> {
    const result: CompressionResult = {
      productId: product.id,
      productName: product.product_name,
      originalUrl: product.image_url,
      success: false,
    };

    try {
      if (!product.image_url) {
        throw new Error('No image URL');
      }

      console.log(`Processing: ${product.product_name}`);

      const originalBlob = await downloadImage(product.image_url);
      result.originalSize = originalBlob.size;

      console.log(`Original size: ${(originalBlob.size / 1024).toFixed(2)} KB`);

      const compressedBlob = await compressImage(originalBlob);
      result.compressedSize = compressedBlob.size;

      const savingsPercent = ((originalBlob.size - compressedBlob.size) / originalBlob.size) * 100;
      result.savings = savingsPercent;

      console.log(`Compressed size: ${(compressedBlob.size / 1024).toFixed(2)} KB (${savingsPercent.toFixed(1)}% savings)`);

      if (compressedBlob.size >= originalBlob.size * 0.9) {
        console.log(`Skipping - compression not significant`);
        result.success = true;
        result.newUrl = product.image_url;
        return result;
      }

      const newUrl = await uploadToSupabase(compressedBlob, product.id);
      result.newUrl = newUrl;

      const { error: updateError } = await supabase
        .from('amazon_products')
        .update({ image_url: newUrl })
        .eq('id', product.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      if (product.image_url.includes('supabase')) {
        try {
          const oldPath = product.image_url.split('/recipe-images/')[1];
          if (oldPath) {
            await supabase.storage.from('recipe-images').remove([oldPath]);
          }
        } catch (e) {
          console.log('Could not delete old image:', e);
        }
      }

      result.success = true;
      console.log(`✓ Successfully compressed and updated ${product.product_name}`);
    } catch (error) {
      console.error(`✗ Failed to process ${product.product_name}:`, error);
      result.error = (error as Error).message;
      result.success = false;
    }

    return result;
  }

  const handleCompress = async () => {
    setCompressing(true);
    setProgress(0);
    setResults([]);
    setStats({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
    });

    try {
      const { data: products, error } = await supabase
        .from('amazon_products')
        .select('id, product_name, image_url')
        .not('image_url', 'is', null);

      if (error) throw error;
      if (!products || products.length === 0) {
        toast.error('No products found with images');
        return;
      }

      const total = products.length;
      setStats(prev => ({ ...prev, total }));
      toast.info(`Found ${total} products to process`);

      const processedResults: CompressionResult[] = [];

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const result = await processProduct(product);
        processedResults.push(result);

        setStats(prev => ({
          ...prev,
          processed: i + 1,
          success: prev.success + (result.success ? 1 : 0),
          failed: prev.failed + (result.success ? 0 : 1),
          totalOriginalSize: prev.totalOriginalSize + (result.originalSize || 0),
          totalCompressedSize: prev.totalCompressedSize + (result.compressedSize || 0),
        }));

        setProgress(((i + 1) / total) * 100);
        setResults([...processedResults]);

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(`Compression complete! Processed ${total} images`);
    } catch (error) {
      console.error('Compression process failed:', error);
      toast.error('Compression failed: ' + (error as Error).message);
    } finally {
      setCompressing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ImageIcon className="h-8 w-8" />
          Amazon Product Image Compression
        </h1>
        <p className="text-muted-foreground mt-1">
          Compress product catalog images by ~75% while maintaining dimensions
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compression Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                How it works
              </h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Downloads each product image</li>
                <li>• Compresses to ~75% smaller file size</li>
                <li>• Maintains original width and height</li>
                <li>• Uploads to Supabase storage</li>
                <li>• Updates database with new URLs</li>
                <li>• Deletes old images from storage</li>
              </ul>
            </div>

            <Button
              onClick={handleCompress}
              disabled={compressing}
              size="lg"
              className="w-full"
            >
              {compressing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Compressing Images...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Start Compression
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {compressing && (
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} className="w-full" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{stats.processed}</div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                  <div className="text-sm text-muted-foreground">Success</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{Math.round(progress)}%</div>
                  <div className="text-sm text-muted-foreground">Complete</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.processed > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Storage Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Original Size</div>
                  <div className="text-2xl font-bold">{formatBytes(stats.totalOriginalSize)}</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Compressed Size</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatBytes(stats.totalCompressedSize)}
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Savings</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalOriginalSize > 0
                      ? Math.round(
                          ((stats.totalOriginalSize - stats.totalCompressedSize) /
                            stats.totalOriginalSize) *
                            100
                        )
                      : 0}
                    %
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Results ({results.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {results.map((result) => (
                  <div
                    key={result.productId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.productName}</div>
                        {result.error && (
                          <div className="text-sm text-red-600 truncate">{result.error}</div>
                        )}
                        {result.originalSize && result.compressedSize && (
                          <div className="text-sm text-muted-foreground">
                            {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
                            {' '}({result.savings?.toFixed(1)}% savings)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
