import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Mic, MicOff, Volume2, HelpCircle, Check, AlertCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

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
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [showCommandFeedback, setShowCommandFeedback] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isManuallyStoppedRef = useRef(false);

  // Initialize Speech Recognition (only once)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onend = () => {
      setIsListening(false);

      // Only auto-restart if voice mode is still active and we didn't stop manually
      if (isActive && !isManuallyStoppedRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            // Ignore — usually means it's already starting
          }
        }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setError('Microphone access was denied. Please allow it and try again.');
        onToggle(); // turn off voice mode
        isManuallyStoppedRef.current = true;
      } else if (event.error === 'aborted') {
        // This is normal during restarts — ignore
      } else if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // Silently try again
        setTimeout(() => {
          if (isActive && !isManuallyStoppedRef.current) recognition.start();
        }, 500);
      } else {
        setError(`Speech error: ${event.error}`);
        setTimeout(() => setError(''), 5000);
      }
    };

    };

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      const final = results
        .filter((r: any) => r.isFinal)
        .map((r: any) => r[0].transcript)
        .join(' ');

      const interim = results
        .filter((r: any) => !r.isFinal)
        .map((r: any) => r[0].transcript)
        .join(' ');

      if (final) {
        setTranscript(final);
        processCommand(final);
        setTimeout(() => setTranscript(''), 2000);
      } else if (interim) {
        setTranscript(interim);
      }
    };

    recognitionRef.current = recognition;

    // Cleanup on unmount
    return () => {
      isManuallyStoppedRef.current = true;
      recognition.stop();
    };
  }, []);

  // Start/stop based on isActive toggle
  useEffect(() => {
    if (!recognitionRef.current || !isSupported) return;

    if (isActive) {
      isManuallyStoppedRef.current = false;
      try {
        recognitionRef.current.start();
        setShowHelp(true);
        setTimeout(() => setShowHelp(false), 10000);
      } catch (err) {
        // Already started or no permission
      }
    } else {
      isManuallyStoppedRef.current = true;
      recognitionRef.current.stop();
      setIsListening(false);
      setTranscript('');
      setError('');
    }
  }, [isActive, isSupported]);

  const processCommand = (text: string) => {
    const lower = text.toLowerCase().trim();

    let command: VoiceCommand | null = null;

    if (/next|next step/.test(lower)) command = { type: 'next' };
    else if (/back|previous|go back/.test(lower)) command = { type: 'previous' };
    else if (/repeat|again|say that again/.test(lower)) command = { type: 'repeat' };
    else if (/ingredient/.test(lower)) command = { type: 'readIngredients' };
    else if (/how long|time left|how much time/.test(lower)) command = { type: 'howLong' };
    else if (/timer|start timer|set timer/.test(lower)) command = { type: 'startTimer' };
    else if (/pause|stop listening|stop/.test(lower)) command = { type: 'pause' };
    else if (/resume|continue|keep going/.test(lower)) command = { type: 'resume' };
    else if (/help/.test(lower)) {
      setShowHelp(true);
      speak('Say: next, back, repeat, read ingredients, how long, start timer, show five, pause, or resume.');
      return;
    } else {
      const match = lower.match(/(?:show|step|go to)\s+(\d+)/);
      if (match) {
        const num = parseInt(match[1]) - 1;
        if (num >= 0) command = { type: 'jumpTo', stepNumber: num };
      }
    }

    if (command) {
      setLastCommand(text);
      setShowCommandFeedback(true);
      onCommand(command);
      setTimeout(() => setShowCommandFeedback(false), 2000);
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceSettings.speechRate;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0 && voiceSettings.voiceIndex < voices.length) {
      utterance.voice = voices[voiceSettings.voiceIndex];
    }

    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) {
    return (
      <Card className="p-5 bg-amber-50 border-amber-300">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900">Voice Control Not Available</h3>
            <p className="text-sm text-amber-700 mt-1">
              Use Chrome, Edge, or Safari (desktop/mobile) for voice commands.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Toggle Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={onToggle}
          size="lg"
          className={`flex-1 gap-4 text-lg font-medium h-14 rounded-xl transition-all ${
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

      {/* Live Listening Feedback */}
      {isActive && isListening && (
        <Card className="p-5 bg-gradient-to-br from-orange-50 to-red-50 border-orange-300">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {[0, 0.1, 0.2, 0.3].map((delay, i) => (
                <span
                  key={i}
                  className="w-1.5 h-10 bg-orange-500 rounded-full animate-pulse"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-orange-900">Listening for commands...</p>
              {transcript && <p className="text-lg mt-2 text-orange-800">"{transcript}"</p>}
            </div>
            <Volume2 className="w-6 h-6 text-orange-600" />
          </div>
        </Card>
      )}

      {/* Command Confirmation */}
      {showCommandFeedback && lastCommand && (
        <Card className="p-4 bg-green-50 border-green-300 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600" />
            <p className="font-medium text-green-900">Command: "{lastCommand}"</p>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* Help Panel */}
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