import { useState, useEffect } from 'react';
import { VoiceSettings } from '../components/VoiceControls';
import { useRecipes } from '../context/RecipeContext';
import { useAuth } from '../context/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import {
  Mail,
  Copy,
  Check,
  Instagram,
  MessageSquare,
  Camera,
  ArrowRight,
  TestTube,
  Loader2,
  Mic,
  Volume2,
  LogOut,
  Globe,
  Lock,
} from 'lucide-react';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { extractRecipeFromText } from '../lib/recipeExtractor';
import { toast } from 'sonner';
import { getUserTimezone, COMMON_TIMEZONES } from '../lib/timezone';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  onNavigate?: (page: string) => void;
}

export function Settings({ onNavigate }: SettingsProps = {}) {
  const { dispatch } = useRecipes();
  const { user, signOut } = useAuth();
  const [forwardingEmail, setForwardingEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [recipeText, setRecipeText] = useState('');
  const [importing, setImporting] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('voiceSettings');
    return saved
      ? JSON.parse(saved)
      : { speechRate: 1.0, voiceIndex: 0, autoRead: true };
  });
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [testingVoice, setTestingVoice] = useState(false);
  const [timezone, setTimezone] = useState<string>(getUserTimezone());
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    initializeUser();
    loadVoices();
    loadTimezone();
  }, []);

  const loadTimezone = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.timezone) {
        setTimezone(data.timezone);
      }
    } catch (error) {
      console.error('Error loading timezone:', error);
    }
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    if (!user) {
      setTimezone(newTimezone);
      toast.info('Timezone updated locally. Sign in to save across devices.');
      return;
    }
    setSavingTimezone(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ timezone: newTimezone })
        .eq('id', user.id);
      if (error) throw error;
      setTimezone(newTimezone);
      toast.success('Timezone updated successfully');
    } catch (error) {
      console.error('Error updating timezone:', error);
      toast.error('Failed to update timezone');
    } finally {
      setSavingTimezone(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('voiceSettings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  const loadVoices = () => {
    if ('speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          setAvailableVoices(window.speechSynthesis.getVoices());
        };
      }
    }
  };

  const initializeUser = async () => {
    try {
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = generateUserId();
        localStorage.setItem('userId', userId);
      }
      setForwardingEmail(`user-${userId.substring(0, 8)}@recipeprep.app`);
    } catch (error) {
      console.error('Error initializing user:', error);
      setForwardingEmail('user-demo123@recipeprep.app');
    } finally {
      setLoading(false);
    }
  };

  const generateUserId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleSpeechRateChange = (value: number[]) => {
    setVoiceSettings((prev) => ({ ...prev, speechRate: value[0] }));
  };

  const handleVoiceChange = (value: string) => {
    setVoiceSettings((prev) => ({ ...prev, voiceIndex: parseInt(value) }));
  };

  const handleAutoReadChange = (checked: boolean) => {
    setVoiceSettings((prev) => ({ ...prev, autoRead: checked }));
  };

  const testVoice = () => {
    if (!('speechSynthesis' in window)) return;
    setTestingVoice(true);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      'This is how I will read your recipe steps. Next, preheat the oven to 350 degrees Fahrenheit.'
    );
    utterance.rate = voiceSettings.speechRate;
    if (availableVoices.length > 0 && voiceSettings.voiceIndex < availableVoices.length) {
      utterance.voice = availableVoices[voiceSettings.voiceIndex];
    }
    utterance.onend = () => setTestingVoice(false);
    utterance.onerror = () => setTestingVoice(false);
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(forwardingEmail);
      setCopied(true);
      toast.success('Email copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy email');
    }
  };

  const handleTestImport = async () => {
    if (!recipeText.trim()) {
      toast.error('Please paste some recipe text');
      return;
    }
    setImporting(true);
    try {
      const extractedRecipe = await extractRecipeFromText(recipeText);
      dispatch({
        type: 'SAVE_RECIPE',
        payload: {
          id: Date.now().toString(),
          title: extractedRecipe.title || 'Untitled Recipe',
          ingredients: extractedRecipe.ingredients,
          instructions: extractedRecipe.instructions,
          prepTime: parseInt(extractedRecipe.prepTime) || 15,
          cookTime: parseInt(extractedRecipe.cookTime) || 30,
          servings: parseInt(extractedRecipe.servings) || 4,
          tags: [...(extractedRecipe.mealTypes || []), ...(extractedRecipe.dietaryTags || [])],
          cuisineType: extractedRecipe.cuisineType || 'Global',
          difficulty: extractedRecipe.difficulty || 'Medium',
          dietaryTags: extractedRecipe.dietaryTags || [],
          imageUrl: extractedRecipe.imageUrl || '',
          sourceUrl: '',
          notes: extractedRecipe.notes || '',
          mealType: extractedRecipe.mealTypes || [],
          isSaved: true,
        },
      });
      toast.success('Recipe imported successfully!');
      setShowTestModal(false);
      setRecipeText('');
    } catch (error) {
      console.error('Error importing recipe:', error);
      toast.error('Failed to import recipe – check format and try again');
    } finally {
      setImporting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Manage your account and preferences</p>
        </div>
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-orange-50 to-red-50 border-b border-orange-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl text-slate-900">Account</CardTitle>
                  <CardDescription className="text-slate-600">
                    {user?.email || 'Your account information'}
                  </CardDescription>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </CardHeader>
          </Card>
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-900">Timezone</CardTitle>
                  <CardDescription className="text-slate-600">
                    Set your timezone for accurate meal planning
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="timezone-select" className="text-sm font-medium text-slate-700 mb-2 block">
                    Select Timezone
                  </Label>
                  <Select value={timezone} onValueChange={handleTimezoneChange} disabled={savingTimezone}>
                    <SelectTrigger id="timezone-select" className="w-full">
                      <SelectValue placeholder="Select your timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-slate-500 mt-2">
                    Current timezone: <span className="font-medium text-slate-700">{timezone}</span>
                  </p>
                  {savingTimezone && (
                    <p className="text-sm text-emerald-600 mt-2 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-900">Change Password</CardTitle>
                  <CardDescription className="text-slate-600">
                    Update your account password
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Button
                onClick={() => setShowPasswordModal(true)}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </CardContent>
          </Card>
          <Card className="border-slate udemy-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-cyan-50 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-900">Your Forwarding Email</CardTitle>
                  <CardDescription className="text-slate-600">
                    Email recipes directly to your personal recipe inbox
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">
                      Your Unique Email Address
                    </Label>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-lg font-mono font-semibold text-slate-900 bg-white px-4 py-3 rounded-md border border-slate-200">
                        {forwardingEmail}
                      </code>
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 shrink-0"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">How it works:</span> Forward any recipe (from Instagram DMs, websites, or photos) to this email address, and it will automatically be saved to your recipe collection.
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowTestModal(true)}
                      variant="outline"
                      className="w-full border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Test Email Import
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-900">How to Save Recipes</CardTitle>
              <CardDescription className="text-slate-600">
                Multiple ways to add recipes to your collection automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                      <Instagram className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">From Instagram DMs</h3>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="aspect-video bg-gradient-to-br from-pink-100 to-purple-100 rounded-md flex items-center justify-center mb-3">
                      <div className="text-center space-y-2">
                        <MessageSquare className="w-12 h-12 text-purple-600 mx-auto" />
                        <p className="text-sm text-slate-600 px-4">
                          Long-press recipe post → Forward → Email
                        </p>
                      </div>
                    </div>
                    <ol className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">1.</span>
                        <span>Long-press on any recipe post in Instagram</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">2.</span>
                        <span>Tap "Forward" and select "Email"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">3.</span>
                        <span>Paste your forwarding email address</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">4.</span>
                        <span>Send and the recipe saves automatically!</span>
                      </li>
                    </ol>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">From Photos</h3>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 rounded-md flex items-center justify-center mb-3">
                      <div className="text-center space-y-2">
                        <Camera className="w-12 h-12 text-cyan-600 mx-auto" />
                        <p className="text-sm text-slate-600 px-4">
                          Screenshot → Share → Email
                        </p>
                      </div>
                    </div>
                    <ol className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">1.</span>
                        <span>Take a screenshot of any recipe</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">2.</span>
                        <span>Open your photos and select the screenshot</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">3.</span>
                        <span>Tap share and choose "Mail"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">4.</span>
                        <span>Send to your forwarding email address</span>
                      </li>
                    </ol>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <Copy className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Copy & Paste Link</h3>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="aspect-video bg-gradient-to-br from-orange-100 to-red-100 rounded-md flex items-center justify-center mb-3">
                      <div className="text-center space-y-2">
                        <Copy className="w-12 h-12 text-orange-600 mx-auto" />
                        <p className="text-sm text-slate-600 px-4">
                          Copy recipe URL → Paste in Add Recipe
                        </p>
                      </div>
                    </div>
                    <ol className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">1.</span>
                        <span>Copy the recipe link from any website</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">2.</span>
                        <span>Click the button below to go to Add Recipe page</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 shrink-0">3.</span>
                        <span>Paste the link and let AI extract the recipe!</span>
                      </li>
                    </ol>
                    <Button
                      onClick={() => onNavigate?.('add-recipe')}
                      className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Go to Add Recipe
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-5 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <ArrowRight className="w-5 h-5<|eos|>