import { useState, useEffect } from 'react';
import { Truck, MapPin, Settings as SettingsIcon, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import {
  getUserDeliveryPreferences,
  saveUserDeliveryPreferences,
  type UserDeliveryPreferences,
} from '../services/deliveryRoutingService';
import { isInstacartEnabled } from '../services/instacartService';

interface DeliveryPreferencesProps {
  userId: string;
}

export function DeliveryPreferences({ userId }: DeliveryPreferencesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [instacartEnabled, setInstacartEnabled] = useState(false);

  const [preferences, setPreferences] = useState<UserDeliveryPreferences>({
    userId,
    defaultService: 'auto',
    deliveryAddress: {
      street: '',
      apt: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
    },
    deliveryInstructions: '',
    preferredDeliveryWindow: '',
    autoRouteFreshItems: true,
    autoRoutePantryItems: true,
    enableCostOptimization: true,
  });

  useEffect(() => {
    loadPreferences();
    checkInstacartStatus();
  }, [userId]);

  const checkInstacartStatus = async () => {
    const enabled = await isInstacartEnabled();
    setInstacartEnabled(enabled);
  };

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const prefs = await getUserDeliveryPreferences(userId);
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading delivery preferences:', error);
      toast.error('Failed to load delivery preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveUserDeliveryPreferences(preferences);
      toast.success('Delivery preferences saved successfully');
    } catch (error) {
      console.error('Error saving delivery preferences:', error);
      toast.error('Failed to save delivery preferences');
    } finally {
      setSaving(false);
    }
  };

  const updateAddress = (field: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      deliveryAddress: {
        ...prev.deliveryAddress,
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Delivery Preferences
        </CardTitle>
        <CardDescription>
          {instacartEnabled
            ? 'Manage your delivery address and routing preferences for Instacart and Amazon'
            : 'Set up your delivery preferences. Instacart integration is currently disabled.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="w-4 h-4" />
            Delivery Address
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={preferences.deliveryAddress.street || ''}
                onChange={(e) => updateAddress('street', e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            <div>
              <Label htmlFor="apt">Apartment / Unit (Optional)</Label>
              <Input
                id="apt"
                value={preferences.deliveryAddress.apt || ''}
                onChange={(e) => updateAddress('apt', e.target.value)}
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={preferences.deliveryAddress.city || ''}
                  onChange={(e) => updateAddress('city', e.target.value)}
                  placeholder="New York"
                />
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={preferences.deliveryAddress.state || ''}
                  onChange={(e) => updateAddress('state', e.target.value)}
                  placeholder="NY"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={preferences.deliveryAddress.zip || ''}
                  onChange={(e) => updateAddress('zip', e.target.value)}
                  placeholder="10001"
                  maxLength={10}
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Select
                  value={preferences.deliveryAddress.country || 'US'}
                  onValueChange={(value) => updateAddress('country', value)}
                >
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
              <Input
                id="instructions"
                value={preferences.deliveryInstructions || ''}
                onChange={(e) => setPreferences({ ...preferences, deliveryInstructions: e.target.value })}
                placeholder="Leave at front door, ring doorbell"
              />
            </div>
          </div>
        </div>

        {instacartEnabled && (
          <>
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm font-medium">
                <SettingsIcon className="w-4 h-4" />
                Routing Preferences
              </div>

              <div>
                <Label htmlFor="defaultService">Default Service</Label>
                <Select
                  value={preferences.defaultService}
                  onValueChange={(value: any) => setPreferences({ ...preferences, defaultService: value })}
                >
                  <SelectTrigger id="defaultService">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Smart Routing)</SelectItem>
                    <SelectItem value="instacart">Instacart Only</SelectItem>
                    <SelectItem value="amazon">Amazon Only</SelectItem>
                    <SelectItem value="manual">Manual Selection</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto routing sends fresh items to Instacart and pantry items to Amazon
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-route Fresh Items</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically send produce, meat, and dairy to Instacart
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoRouteFreshItems}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, autoRouteFreshItems: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-route Pantry Items</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically send packaged goods to Amazon
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoRoutePantryItems}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, autoRoutePantryItems: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Cost Optimization</Label>
                    <p className="text-xs text-muted-foreground">
                      Suggest best pricing between services
                    </p>
                  </div>
                  <Switch
                    checked={preferences.enableCostOptimization}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, enableCostOptimization: checked })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="deliveryWindow">Preferred Delivery Window (Optional)</Label>
              <Input
                id="deliveryWindow"
                value={preferences.preferredDeliveryWindow || ''}
                onChange={(e) => setPreferences({ ...preferences, preferredDeliveryWindow: e.target.value })}
                placeholder="e.g., 2-4 PM"
              />
            </div>
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !preferences.deliveryAddress.street}
          className="w-full"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Delivery Preferences
            </>
          )}
        </Button>

        {!preferences.deliveryAddress.street && (
          <p className="text-xs text-amber-600 text-center">
            Please enter your delivery address to enable delivery features
          </p>
        )}
      </CardContent>
    </Card>
  );
}
