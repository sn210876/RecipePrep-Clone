import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Copy, Check, Instagram, MessageSquare, Camera, ArrowRight, TestTube, Loader2, Mic, Volume2, LogOut, Globe, Lock, Download, Crown, Languages, BookOpen, Trash2, AlertTriangle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { migrateExistingPosts } from '@/lib/imageStorage';
import { toast } from 'sonner';
import { isAdmin, supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { languages, type LanguageCode } from '@/lib/translations';
import { useLanguage } from '@/context/LanguageContext';
import { DeliveryPreferences } from '@/components/DeliveryPreferences';

const COMMON_TIMEZONES = [
  { label: '--- Americas ---', value: 'header-americas', isHeader: true },
  { label: 'Eastern Time (ET)', value: 'America/New_York' },
  { label: 'Central Time (CT)', value: 'America/Chicago' },
  { label: 'Mountain Time (MT)', value: 'America/Denver' },
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
  { label: 'Alaska Time (AKT)', value: 'America/Anchorage' },
  { label: 'Hawaii Time (HT)', value: 'Pacific/Honolulu' },
  { label: 'Toronto', value: 'America/Toronto' },
  { label: 'Mexico City', value: 'America/Mexico_City' },
  { label: 'São Paulo', value: 'America/Sao_Paulo' },
  { label: 'Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
  { label: 'Santiago', value: 'America/Santiago' },

  { label: '--- Europe ---', value: 'header-europe', isHeader: true },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Berlin (CET/CEST)', value: 'Europe/Berlin' },
  { label: 'Rome (CET/CEST)', value: 'Europe/Rome' },
  { label: 'Madrid (CET/CEST)', value: 'Europe/Madrid' },
  { label: 'Amsterdam (CET/CEST)', value: 'Europe/Amsterdam' },
  { label: 'Stockholm (CET/CEST)', value: 'Europe/Stockholm' },
  { label: 'Athens (EET/EEST)', value: 'Europe/Athens' },
  { label: 'Moscow (MSK)', value: 'Europe/Moscow' },
  { label: 'Istanbul (TRT)', value: 'Europe/Istanbul' },

  { label: '--- Asia ---', value: 'header-asia', isHeader: true },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'Bangkok (ICT)', value: 'Asia/Bangkok' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Hong Kong (HKT)', value: 'Asia/Hong_Kong' },
  { label: 'Shanghai (CST)', value: 'Asia/Shanghai' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Seoul (KST)', value: 'Asia/Seoul' },
  { label: 'Manila (PHT)', value: 'Asia/Manila' },
  { label: 'Jakarta (WIB)', value: 'Asia/Jakarta' },

  { label: '--- Africa ---', value: 'header-africa', isHeader: true },
  { label: 'Cairo (EET)', value: 'Africa/Cairo' },
  { label: 'Johannesburg (SAST)', value: 'Africa/Johannesburg' },
  { label: 'Lagos (WAT)', value: 'Africa/Lagos' },
  { label: 'Nairobi (EAT)', value: 'Africa/Nairobi' },

  { label: '--- Oceania ---', value: 'header-oceania', isHeader: true },
  { label: 'Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
  { label: 'Melbourne (AEST/AEDT)', value: 'Australia/Melbourne' },
  { label: 'Brisbane (AEST)', value: 'Australia/Brisbane' },
  { label: 'Perth (AWST)', value: 'Australia/Perth' },
  { label: 'Auckland (NZST/NZDT)', value: 'Pacific/Auckland' },
];

interface SettingsProps {
  onNavigate: (page: string) => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  const { signOut, user } = useAuth();
  const { language: currentLanguage, setLanguage: setGlobalLanguage, t } = useLanguage();
  const [forwardingEmail, setForwardingEmail] = useState('user-demo123@mealscrape.app');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [recipeText, setRecipeText] = useState('');
  const [importing, setImporting] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({ speechRate: 1.0, voiceIndex: 0, autoRead: true });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testingVoice, setTestingVoice] = useState(false);
  const [timezone, setTimezone] = useState('America/New_York');
  const [language, setLanguage] = useState<LanguageCode>(currentLanguage);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [migratingImages, setMigratingImages] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    isAdmin().then(setIsUserAdmin);
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    }
  }, []);

  useEffect(() => {
    const loadPreferences = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('timezone, language')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          if (data.timezone) setTimezone(data.timezone);
          if (data.language) setLanguage(data.language as LanguageCode);
        }
      }
    };

    loadPreferences();
  }, [user]);

  const savePreferences = async () => {
    if (!user) return;

    setSavingPreferences(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          timezone,
          language
        })
        .eq('id', user.id);

      if (error) throw error;

      await setGlobalLanguage(language);
      toast.success(t.settings.changesSaved);
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast.error(t.settings.errorSaving);
    } finally {
      setSavingPreferences(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(forwardingEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy');
    }
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

  const handleMigrateImages = async () => {
    if (!window.confirm('This will download and store all Instagram images permanently. Continue?')) {
      return;
    }

    setMigratingImages(true);
    toast.loading('Migrating images... This may take a while', { id: 'migrate', duration: 0 });

    try {
      const result = await migrateExistingPosts();

      if (result) {
        const { successCount, expiredCount, expiredPosts, total } = result;

        if (expiredCount > 0) {
          const expiredTitles = expiredPosts?.map((p: any) => `"${p.title}"`).join(', ') || '';
          toast.warning(
            `Migration complete! Migrated: ${successCount}, Expired URLs: ${expiredCount}. These posts need to be re-added: ${expiredTitles}`,
            { id: 'migrate', duration: 10000 }
          );
        } else {
          toast.success(
            `Migration complete! Successfully migrated ${successCount} of ${total} posts`,
            { id: 'migrate' }
          );
        }
      } else {
        toast.error('Migration failed - no result returned', { id: 'migrate' });
      }
    } catch (error: any) {
      toast.error('Migration failed: ' + error.message, { id: 'migrate' });
    } finally {
      setMigratingImages(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeletingAccount(true);
    toast.loading('Deleting your account and all data...', { id: 'delete-account' });

    try {
      if (!user) throw new Error('No user logged in');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete account error response:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to delete account');
      }

      toast.success('Account deleted successfully', { id: 'delete-account' });

      await signOut();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account: ' + error.message, { id: 'delete-account' });
      setDeletingAccount(false);
      setShowDeleteAccountModal(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Mobile-optimized container with safe padding */}
      <div className="w-full max-w-5xl mx-auto px-4 pt-2 pb-20 sm:px-6 md:px-8">
        {/* Header - Responsive sizing */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">{t.settings.title}</h1>
          <p className="text-sm sm:text-base text-slate-600">{t.settings.preferences}</p>
        </div>

        {/* Cards with mobile-optimized spacing */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Account Card */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-orange-50 to-red-50 border-b border-orange-100 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl text-slate-900 truncate">Account</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600 truncate">
                    {user?.email || 'user@example.com'}
                  </CardDescription>
                </div>
                <Button
                  onClick={signOut}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50 shrink-0 text-xs sm:text-sm"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Log Out</span>
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Language & Timezone Card */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Languages className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl text-slate-900">{t.settings.preferences}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    {t.settings.languageDescription}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <Label htmlFor="language-select" className="text-xs sm:text-sm font-medium text-slate-700 mb-2 block">
                    {t.settings.language}
                  </Label>
                  <Select value={language} onValueChange={(val) => setLanguage(val as LanguageCode)} disabled={savingPreferences}>
                    <SelectTrigger id="language-select" className="w-full h-10 sm:h-11 text-sm sm:text-base">
                      <SelectValue placeholder="Select your language" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(languages).map(([code, name]) => (
                        <SelectItem key={code} value={code} className="text-sm sm:text-base">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">
                    Selected: <span className="font-medium text-slate-700">{languages[language]}</span>
                  </p>
                </div>

                <div>
                  <Label htmlFor="timezone-select" className="text-xs sm:text-sm font-medium text-slate-700 mb-2 block">
                    {t.settings.timezone}
                  </Label>
                  <Select value={timezone} onValueChange={setTimezone} disabled={savingPreferences}>
                    <SelectTrigger id="timezone-select" className="w-full h-10 sm:h-11 text-sm sm:text-base">
                      <SelectValue placeholder="Select your timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tz) =>
                        tz.isHeader ? (
                          <div key={tz.value} className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                            {tz.label}
                          </div>
                        ) : (
                          <SelectItem key={tz.value} value={tz.value} className="text-sm sm:text-base">
                            {tz.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">
                    Current: <span className="font-medium text-slate-700">{timezone}</span>
                  </p>
                </div>

                <Button
                  onClick={savePreferences}
                  disabled={savingPreferences}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-11"
                >
                  {savingPreferences ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.settings.saving}
                    </>
                  ) : (
                    t.settings.saveChanges
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Preferences */}
          {user && <DeliveryPreferences userId={user.id} />}

          {/* Change Password Card */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-100 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl text-slate-900">Change Password</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    Update your account password
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <Button
                onClick={() => setShowPasswordModal(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 h-10 sm:h-11 text-sm sm:text-base"
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Onboarding Card */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl text-slate-900">App Tutorial</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    View the welcome tutorial again
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <Button
                onClick={() => onNavigate('onboarding')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 sm:h-11 text-sm sm:text-base"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                View Tutorial
              </Button>
            </CardContent>
          </Card>

          {/* Forwarding Email Card */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-cyan-50 border-b border-blue-100 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl text-slate-900">Your Forwarding Email</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    Coming soon... Email recipes to your personal inbox
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border-2 border-slate-200">
                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">
                  Your Unique Email Address
                </Label>
                <div className="flex items-center gap-2 sm:gap-3">
                  <code className="flex-1 text-xs sm:text-sm md:text-base font-mono font-semibold text-slate-900 bg-white px-3 py-2 sm:px-4 sm:py-3 rounded-md border border-slate-200 overflow-x-auto">
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
                  <p className="text-xs sm:text-sm text-slate-700">
                    <span className="font-semibold">How it works:</span> Forward any recipe to this email, and it will automatically be saved to your collection.
                  </p>
                </div>
                <Button
                  onClick={() => setShowTestModal(true)}
                  variant="outline"
                  className="w-full border-blue-200 hover:bg-blue-50 h-10 sm:h-11 text-sm sm:text-base"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Email Import
                </Button>
              </div>
            </CardContent>
          </Card>

     

          {/* Voice Control Settings */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl text-slate-900">Voice Control</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    Customize voice commands in Cook Mode
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {'speechSynthesis' in window ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Auto-Read Toggle */}
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                    <div className="flex-1 min-w-0 mr-3">
                      <Label htmlFor="auto-read" className="text-sm sm:text-base font-semibold text-slate-900 cursor-pointer">
                        Auto-Read Steps
                      </Label>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        Auto-read each step aloud
                      </p>
                    </div>
                    <Switch
                      id="auto-read"
                      checked={voiceSettings.autoRead}
                      onCheckedChange={(checked) => setVoiceSettings(prev => ({ ...prev, autoRead: checked }))}
                    />
                  </div>

                  {/* Speech Rate */}
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-sm sm:text-base font-semibold text-slate-900">
                      Speech Rate: {voiceSettings.speechRate.toFixed(1)}x
                    </Label>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="text-xs sm:text-sm text-slate-600 w-10 sm:w-12">Slow</span>
                      <Slider
                        value={[voiceSettings.speechRate]}
                        onValueChange={(value) => setVoiceSettings(prev => ({ ...prev, speechRate: value[0] }))}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-xs sm:text-sm text-slate-600 w-10 sm:w-12 text-right">Fast</span>
                    </div>
                  </div>

                  {/* Voice Selection */}
                  {availableVoices.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-sm sm:text-base font-semibold text-slate-900">
                        Voice Selection
                      </Label>
                      <Select
                        value={voiceSettings.voiceIndex.toString()}
                        onValueChange={(value) => setVoiceSettings(prev => ({ ...prev, voiceIndex: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-full h-10 sm:h-11 text-sm sm:text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVoices.map((voice, index) => (
                            <SelectItem key={index} value={index.toString()} className="text-sm sm:text-base">
                              {voice.name} ({voice.lang})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Test Voice Button */}
                  <Button
                    onClick={testVoice}
                    disabled={testingVoice}
                    variant="outline"
                    className="w-full border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 h-10 sm:h-11 text-sm sm:text-base"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    {testingVoice ? 'Playing...' : 'Test Voice Settings'}
                  </Button>

                  {/* Info Box */}
                  <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs sm:text-sm text-slate-700">
                      <span className="font-semibold">Voice commands in Cook Mode:</span>
                      <br />"Next", "Previous", "Repeat", "Read ingredients", and more.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-300">
                  <p className="text-xs sm:text-sm text-amber-900">
                    Voice control not supported in your browser. Try Chrome, Edge, or Safari.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Tools - Only visible to admins */}
          {isUserAdmin && (
            <Card className="border-purple-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-100 p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg sm:text-xl md:text-2xl text-slate-900">Admin Tools</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-600">
                      Database maintenance and migration tools
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <h3 className="font-semibold text-slate-900 mb-2">Migrate Instagram Images</h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Downloads all Instagram images from posts and stores them permanently in Supabase storage to prevent expiration.
                    </p>
                    <Button
                      onClick={handleMigrateImages}
                      disabled={migratingImages}
                      className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
                    >
                      {migratingImages ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Migrating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Migrate Images
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="font-semibold text-slate-900 mb-2">Compress Product Images</h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Reduce Amazon product image file sizes by ~75% while maintaining dimensions. Saves storage space and improves load times.
                    </p>
                    <Button
                      onClick={() => onNavigate('admin-product-compression')}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Compress Images
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Danger Zone - Delete Account */}
          <Card className="border-red-300 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-red-50 to-rose-50 border-b border-red-200 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl text-red-900">Danger Zone</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-red-700">
                    Permanent account deletion
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Delete Your Account
                  </h3>
                  <p className="text-sm text-red-800 mb-3">
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </p>
                  <ul className="text-sm text-red-700 space-y-1 mb-4 list-disc list-inside">
                    <li>All your saved recipes will be deleted</li>
                    <li>Your profile and posts will be removed</li>
                    <li>All uploaded images and videos will be deleted</li>
                    <li>Your meal plans and grocery lists will be lost</li>
                    <li>You will lose access to any premium features</li>
                  </ul>
                  <Button
                    onClick={() => setShowDeleteAccountModal(true)}
                    variant="destructive"
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Import Modal */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
              <TestTube className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              Test Email Import
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Paste recipe text to simulate email import
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 mt-4">
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
              <p className="text-xs sm:text-sm text-slate-600 mb-2">
                <span className="font-semibold">Example format:</span>
              </p>
              <pre className="text-[10px] sm:text-xs text-slate-700 bg-white p-2 sm:p-3 rounded border border-slate-200 overflow-x-auto">
{`Chocolate Chip Cookies

Ingredients:
2 cups flour
1 tsp baking soda
1 cup butter
2 eggs
2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F
2. Mix dry ingredients
3. Cream butter and sugar
4. Fold in chips
5. Bake 10-12 minutes`}
              </pre>
            </div>

            <div>
              <Label htmlFor="recipe-text" className="text-sm sm:text-base font-semibold mb-2 block">
                Paste Recipe Text
              </Label>
              <Textarea
                id="recipe-text"
                placeholder="Paste your recipe here..."
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                className="min-h-[200px] sm:min-h-[300px] font-mono text-xs sm:text-sm"
              />
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => {
                  setImporting(true);
                  setTimeout(() => {
                    setImporting(false);
                    setShowTestModal(false);
                    setRecipeText('');
                  }, 1000);
                }}
                disabled={importing || !recipeText.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 text-sm sm:text-base"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Recipe'
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowTestModal(false);
                  setRecipeText('');
                }}
                variant="outline"
                disabled={importing}
                className="h-10 sm:h-11 text-sm sm:text-base"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Change Password</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter your new password. Must be at least 6 characters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="new-password" className="text-sm sm:text-base">New Password</Label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-sm sm:text-base">Confirm Password</Label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex gap-2 sm:gap-3 pt-2">
              <Button
                onClick={() => {
                  if (newPassword !== confirmPassword) {
                    alert('Passwords do not match');
                    return;
                  }
                  if (newPassword.length < 6) {
                    alert('Password must be at least 6 characters');
                    return;
                  }
                  setChangingPassword(true);
                  setTimeout(() => {
                    setChangingPassword(false);
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }, 1000);
                }}
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="flex-1 bg-purple-600 hover:bg-purple-700 h-10 sm:h-11 text-sm sm:text-base"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                variant="outline"
                disabled={changingPassword}
                className="h-10 sm:h-11 text-sm sm:text-base"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Modal */}
      <Dialog open={showDeleteAccountModal} onOpenChange={setShowDeleteAccountModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-red-700">
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-900 mb-2">
                You will lose everything:
              </p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>All your saved recipes</li>
                <li>Your profile and all posts</li>
                <li>All uploaded photos and videos</li>
                <li>Meal plans and grocery lists</li>
                <li>Followers and following connections</li>
                <li>All referral rewards</li>
              </ul>
            </div>
            <div>
              <Label htmlFor="delete-confirm" className="text-sm sm:text-base font-semibold text-red-900">
                Type <span className="font-mono bg-red-100 px-2 py-0.5 rounded">DELETE</span> to confirm
              </Label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mt-2"
                placeholder="Type DELETE"
              />
            </div>
            <div className="flex gap-2 sm:gap-3 pt-2">
              <Button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteConfirmText('');
                }}
                variant="outline"
                disabled={deletingAccount}
                className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700 h-10 sm:h-11 text-sm sm:text-base"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Forever
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}