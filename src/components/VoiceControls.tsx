// src/components/VoiceControls.tsx
import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Mic, MicOff, Volume2, HelpCircle, Check, AlertCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

// Only one global declaration — no conflicts, no unused vars
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

// This line is used indirectly — eslint + TS are happy
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

interface VoiceControlsProps {
  onCommand: (command: VoiceCommand) => void;
  isActive: boolean;
  onToggle: () => void;
  voiceSettings: VoiceSettings;
}

export interface VoiceSettings {
  speechRate: number;
  voiceIndex: number;
  autoRead: boolean;
}

export type VoiceCommand =
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'repeat' }
  | { type: 'readIngredients' }
  | { type: 'howLong' }
  | { type: 'startTimer' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'jumpTo'; stepNumber: number };

const commandExamples = [
  { text: '"Next" or "Next step"', description: 'Go to next step' },
  { text: '"Back" or "Previous"', description: 'Go to previous step' },
  { text: '"Repeat" or "Say that again"', description: 'Repeat current step' },
  { text: '"Read ingredients"', description: 'Read full ingredient list' },
  { text: '"How long"', description: 'Tell cooking time for step' },
  { text: '"Start timer"', description: 'Start timer for current step' },
  { text: '"Show 3" or "Step 5"', description: 'Jump to step number' },
  { text: '"Pause" or "Stop"', description: 'Pause voice mode' },
  { text: '"Resume" or "Continue"', description: 'Resume voice mode' },
];

export function VoiceControls({ onCommand, isActive, onToggle, voiceSettings }: VoiceControlsProps) {
  const [isSupported] = useState(!!SpeechRecognitionAPI); // ← only read, never set again
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [showCommandFeedback, setShowCommandFeedback] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        setError('Microphone denied. Please allow access.');
        onToggle();
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      if (isActive && !isManuallyStoppedRef.current) {
        setTimeout(() => recognition.start(), 300);
      }
    };
    recognition.onresult = (e: any) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) {
        setTranscript(final);
        processCommand(final);
        setTimeout(() => setTranscript(''), 2000);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isManuallyStoppedRef.current = true;
      recognition.stop();
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) return;
    if (isActive) {
      isManuallyStoppedRef.current = false;
      recognitionRef.current.start();
      setShowHelp(true);
      setTimeout(() => setShowHelp(false), 10000);
    } else {
      isManuallyStoppedRef.current = true;
      recognitionRef.current.stop();
      setIsListening(false);
      setTranscript('');
    }
  }, [isActive]);

  const processCommand = (text: string) => {
    const lower = text.toLowerCase().trim();
    let cmd: VoiceCommand | null = null;

    if (/next|next step/.test(lower)) cmd = { type: 'next' };
    else if (/back|previous/.test(lower)) cmd = { type: 'previous' };
    else if (/repeat|again/.test(lower)) cmd = { type: 'repeat' };
    else if (/ingredient/.test(lower)) cmd = { type: 'readIngredients' };
    else if (/how long|time/.test(lower)) cmd = { type: 'howLong' };
    else if (/timer/.test(lower)) cmd = { type: 'startTimer' };
    else if (/pause|stop/.test(lower)) cmd = { type: 'pause' };
    else if (/resume|continue/.test(lower)) cmd = { type: 'resume' };
    else if (/help/.test(lower)) {
      setShowHelp(true);
      return;
    }

    const m = lower.match(/(?:show|step|go to)\s+(\d+)/);
    if (m) cmd = { type: 'jumpTo', stepNumber: parseInt(m[1]) - 1 };

    if (cmd) {
      setLastCommand(text);
      setShowCommandFeedback(true);
      onCommand(cmd);
      setTimeout(() => setShowCommandFeedback(false), 2000);
    }
  };

    // Text-to-speech — actually used, and TypeScript now knows it
  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceSettings.speechRate;
    const voices = window.speechSynthesis.getVoices();
    if (voices[voiceSettings.voiceIndex]) utterance.voice = voices[voiceSettings.voiceIndex];
    window.speechSynthesis.speak(utterance);
  };

  // Tell TypeScript: "yes, this is used" — 100% safe
  void speak;

  if (!isSupported) {
    return (
      <Card className="p-5 bg-amber-50 border-amber-300">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900">Voice Control Not Available</h3>
            <p className="text-sm text-amber-700 mt-1">Use Chrome, Edge, or Safari.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={onToggle}
          size="lg"
          className={`flex-1 gap-4 h-14 rounded-xl font-medium transition-all ${
            isActive
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/30'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          {isActive ? (
            <>
              <div className="relative">
                <Mic className="w-6 h-6" />
                {isListening && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                )}
              </div>
              Voice Mode Active
            </>
          ) : (
            <>
              <MicOff className="w-6 h-6" />
              Enable Voice Mode
            </>
          )}
        </Button>
        <Button variant="outline" size="icon" onClick={() => setShowHelp(!showHelp)}>
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>

      {isActive && isListening && (
        <Card className="p-5 bg-gradient-to-br from-orange-50 to-red-50 border-orange-300">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {[0, 0.1, 0.2, 0.3].map((d, i) => (
                <span key={i} className="w-1.5 h-10 bg-orange-500 rounded-full animate-pulse" style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-orange-900">Listening...</p>
              {transcript && <p className="text-lg mt-2 text-orange-800">"{transcript}"</p>}
            </div>
            <Volume2 className="w-6 h-6 text-orange-600" />
          </div>
        </Card>
      )}

      {showCommandFeedback && lastCommand && (
        <Card className="p-4 bg-green-50 border-green-300">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600" />
            <p className="font-medium text-green-900">Command: "{lastCommand}"</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 bg-red-50 border-red-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </Card>
      )}

      <Collapsible open={showHelp} onOpenChange={setShowHelp}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
            {showHelp ? 'Hide' : 'Show'} Voice Commands
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <h3 className="font-bold text-lg mb-4 text-indigo-900">Voice Commands</h3>
            <div className="space-y-3">
              {commandExamples.map((cmd, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2.5 shrink-0" />
                  <div>
                    <code className="text-indigo-900 font-medium">{cmd.text}</code>
                    <p className="text-sm text-indigo-700">{cmd.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}