import { useState, useEffect } from 'react';
import { VoiceSettings } from '../components/VoiceControls';
import { useRecipes } from '../context/RecipeContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Mail, Copy, Check, Instagram, MessageSquare, Camera, ArrowRight, TestTube, Loader2, Mic, Volume2, LogOut, Globe, Lock } from 'lucide-react';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { extractRecipeFromText } from '../services/recipeExtractor';
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
  const [voiceSettings, setVoiceSettings] = useState(() => {
    const saved = localStorage.getItem('voiceSettings');
    return saved ? JSON.parse(saved) : { speechRate: 1.0, voiceIndex: 0, autoRead: true };
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
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
      const userId = localStorage.getItem('userId') || generateUserId();
      localStorage.setItem('userId', userId);
      setForwardingEmail(`user-${userId.substring(0,8)}@mealscrape.forwardemail.net`);
    } catch (error) {
      console.error('Error initializing user:', error);
      setForwardingEmail('user-demo123@mealscrape.app');
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
    setVoiceSettings((prev: VoiceSettings) => ({ ...prev, speechRate: value[0] }));
  };

  const handleVoiceChange = (value: string) => {
    setVoiceSettings((prev: VoiceSettings) => ({ ...prev, voiceIndex: parseInt(value) }));
  };

  const handleAutoReadChange = (checked: boolean) => {
    setVoiceSettings((prev: VoiceSettings) => ({ ...prev, autoRead: checked }));
  };

  const testVoice = () => {
    if ('speechSynthesis' in window) {
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
    }
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
          title: extractedRecipe.title,
          ingredients: extractedRecipe.ingredients,
          instructions: extractedRecipe.instructions,
          prepTime: parseInt(extractedRecipe.prepTime),
          cookTime: parseInt(extractedRecipe.cookTime),
          servings: parseInt(extractedRecipe.servings),
          tags: [...extractedRecipe.mealTypes, ...extractedRecipe.dietaryTags],
          cuisineType: extractedRecipe.cuisineType,
          difficulty: extractedRecipe.difficulty,
          dietaryTags: extractedRecipe.dietaryTags,
          imageUrl: extractedRecipe.imageUrl,
          sourceUrl: '',
          notes: extractedRecipe.notes,
          mealType: extractedRecipe.mealTypes,
          isSaved: true
        }
      });

      toast.success('Recipe imported successfully!');
      setShowTestModal(false);
      setRecipeText('');
    } catch (error) {
      console.error('Error importing recipe:', error);
      toast.error('Failed to import recipe');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 pt-safe pb-safe">
      <div className="max-w-5xl mx-auto pb-28">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 leading-tight">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Manage your account and preferences
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-orange-50 to-red-50 border-b border-orange-100 p-4 sm:p-6">
              <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg sm:text-2xl text-slate-900 truncate">
                      Account
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-600 truncate">
                      {user?.email || 'Your account information'}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50 h-9 text-sm w-full sm:w-auto"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-2xl text-slate-900">
                    Timezone
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    Set your timezone for meal planning
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="timezone-select" className="text-sm font-medium text-slate-700 mb-2 block">
                    Select Timezone
                  </Label>
                  <Select value={timezone} onValueChange={handleTimezoneChange} disabled={savingTimezone}>
                    <SelectTrigger id="timezone-select" className="w-full h-11 text-base">
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
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 break-words">
                    Current: <span className="font-medium text-slate-700">{timezone}</span>
                  </p>
                  {savingTimezone && (
                    <p className="text-xs sm:text-sm text-emerald-600 mt-2 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-100 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-2xl text-slate-900">
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    Update your account password
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <Button
                onClick={() => setShowPasswordModal(true)}
                className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-base"
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-cyan-50 border-b border-blue-100 p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-2xl text-slate-900 leading-tight">
                    Your Forwarding Email
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    Coming soon... Email recipes directly to your inbox
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border-2 border-slate-200">
                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">
                      Your Unique Email Address
                    </Label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <code className="flex-1 text-sm sm:text-base font-mono font-semibold text-slate-900 bg-white px-3 py-2 sm:px-4 sm:py-3 rounded-md border border-slate-200 break-all">
                        {forwardingEmail}
                      </code>
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 sm:h-12 sm:w-12 shrink-0"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-6 space-y-3">
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <span className="font-semibold">How it works:</span> Forward any recipe to this email and it will automatically be saved.
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowTestModal(true)}
                      variant="outline"
                      className="w-full h-11 border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-base"
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-2xl text-slate-900">
                How to Save Recipes
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600">
                Multiple ways to add recipes automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
                    Instagram DMs - Coming Soon
                  </h3>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
                  <div className="aspect-video bg-gradient-to-br from-pink-100 to-purple-100 rounded-md flex items-center justify-center mb-3">
                    <div className="text-center space-y-2 p-4">
                      <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600 mx-auto" />
                      <p className="text-xs sm:text-sm text-slate-600">
                        Long-press → Forward → Email
                      </p>
                    </div>
                  </div>
                  <ol className="space-y-2 text-xs sm:text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">1.</span>
                      <span>Long-press on recipe post</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">2.</span>
                      <span>Tap "Forward" and select "Email"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">3.</span>
                      <span>Paste your forwarding email</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">4.</span>
                      <span>Send and it saves automatically!</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
                    From Photos - Coming Soon
                  </h3>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 rounded-md flex items-center justify-center mb-3">
                    <div className="text-center space-y-2 p-4">
                      <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-600 mx-auto" />
                      <p className="text-xs sm:text-sm text-slate-600">
                        Screenshot → Share → Email
                      </p>
                    </div>
                  </div>
                  <ol className="space-y-2 text-xs sm:text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">1.</span>
                      <span>Take a screenshot of any recipe</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">2.</span>
                      <span>Open photos and select screenshot</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">3.</span>
                      <span>Tap share and choose "Mail"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">4.</span>
                      <span>Send to your forwarding email</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
                    Copy & Paste Link
                  </h3>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-red-100 rounded-md flex items-center justify-center mb-3">
                    <div className="text-center space-y-2 p-4">
                      <Copy className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600 mx-auto" />
                      <p className="text-xs sm:text-sm text-slate-600">
                        Copy URL → Paste in Add Recipe
                      </p>
                    </div>
                  </div>
                  <ol className="space-y-2 text-xs sm:text-sm text-slate-700 mb-3">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">1.</span>
                      <span>Copy the recipe link from any website</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">2.</span>
                      <span>Click the button below to go to Add Recipe</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 shrink-0">3.</span>
                      <span>Paste the link and let AI extract it!</span>
                    </li>
                  </ol>
                  <Button
                    onClick={() => onNavigate?.('add-recipe')}
                    className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-base"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Go to Add Recipe
                  </Button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">
                      Pro Tip
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      Save your forwarding email as a contact in your phone for quick access.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-2xl text-slate-900">
                    Voice Control Settings
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    Customize voice commands in Cook Mode
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:pt-6">
              {'speechSynthesis' in window ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 gap-3">
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="auto-read" className="text-sm sm:text-base font-semibold text-slate-900 cursor-pointer">
                        Auto-Read Steps
                      </Label>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        Automatically read each step aloud
                      </p>
                    </div>
                    <Switch
                      id="auto-read"
                      checked={voiceSettings.autoRead}
                      onCheckedChange={handleAutoReadChange}
                      className="shrink-0"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm sm:text-base font-semibold text-slate-900">
                      Speech Rate: {voiceSettings.speechRate.toFixed(1)}x
                    </Label>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="text-xs sm:text-sm text-slate