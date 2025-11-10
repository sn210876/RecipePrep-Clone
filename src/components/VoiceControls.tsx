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

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const commandExamples = [
  { text: '"Next" or "Next step"', description: 'Go to next step' },
  { text: '"Back" or "Previous"', description: 'Go to previous step' },
  { text: '"Repeat" or "Say that again"', description: 'Repeat current step' },
  { text: '"Read ingredients"', description: 'Read full ingredient list' },
  { text: '"How long"', description: 'Tell cooking time for step' },
  { text: '"Start timer"', description: 'Start timer for current step' },
  { text: '"Show 3"', description: 'Jump to step number 3' },
  { text: '"Pause" or "Resume"', description: 'Pause/resume voice mode' },
];

export function VoiceControls({ onCommand, isActive, onToggle, voiceSettings }: VoiceControlsProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<string>('');
  const [showCommandFeedback, setShowCommandFeedback] = useState(false);
  const [error, setError] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const results = Array.from(event.results);
        const finalTranscripts = results
          .filter(result => result.isFinal)
          .map(result => result[0].transcript);

        const interimTranscripts = results
          .filter(result => !result.isFinal)
          .map(result => result[0].transcript);

        if (finalTranscripts.length > 0) {
          const finalText = finalTranscripts[finalTranscripts.length - 1];
          setTranscript(finalText);
          processCommand(finalText);

          setTimeout(() => {
            setTranscript('');
          }, 2000);
        } else if (interimTranscripts.length > 0) {
          setTranscript(interimTranscripts.join(' '));
        }

        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        restartTimeoutRef.current = setTimeout(() => {
          if (isActive && recognitionRef.current) {
            try {
              recognitionRef.current.stop();
              setTimeout(() => {
                if (isActive && recognitionRef.current) {
                  recognitionRef.current.start();
                }
              }, 100);
            } catch (err) {
              console.error('Error restarting recognition:', err);
            }
          }
        }, 30000);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError('Microphone access denied. Please enable microphone permissions.');
          setPermissionStatus('denied');
          setIsListening(false);
          onToggle();
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Listening continues...');
          setTimeout(() => setError(''), 3000);
        } else {
          setError(`Error: ${event.error}`);
          setTimeout(() => setError(''), 5000);
        }
      };

      recognitionRef.current.onend = () => {
        if (isActive) {
          setTimeout(() => {
            if (isActive && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.error('Error restarting recognition:', err);
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError('');
        setPermissionStatus('granted');
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isActive && recognitionRef.current && isSupported) {
      try {
        recognitionRef.current.start();
        setShowHelp(true);
        setTimeout(() => setShowHelp(false), 10000);
      } catch (err) {
        console.error('Error starting recognition:', err);
      }
    } else if (!isActive && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setTranscript('');
    }
  }, [isActive, isSupported]);

  const processCommand = (text: string) => {
    const lowerText = text.toLowerCase().trim();

    let command: VoiceCommand | null = null;

    if (lowerText.includes('next')) {
      command = { type: 'next' };
    } else if (lowerText.includes('back') || lowerText.includes('previous')) {
      command = { type: 'previous' };
    } else if (lowerText.includes('repeat') || lowerText.includes('say that again') || lowerText.includes('again')) {
      command = { type: 'repeat' };
    } else if (lowerText.includes('ingredient')) {
      command = { type: 'readIngredients' };
    } else if (lowerText.includes('how long') || lowerText.includes('how much time')) {
      command = { type: 'howLong' };
    } else if (lowerText.includes('start timer') || lowerText.includes('set timer')) {
      command = { type: 'startTimer' };
    } else if (lowerText.includes('pause') || lowerText.includes('stop')) {
      command = { type: 'pause' };
    } else if (lowerText.includes('resume') || lowerText.includes('continue')) {
      command = { type: 'resume' };
    } else if (lowerText.includes('help')) {
      setShowHelp(true);
      speak('Available commands are: next step, previous step, repeat, read ingredients, how long, start timer, show step number');
      return;
    } else {
      const showMatch = lowerText.match(/show\s+(\d+)|step\s+(\d+)|go to\s+(\d+)/);
      if (showMatch) {
        const stepNumber = parseInt(showMatch[1] || showMatch[2] || showMatch[3]);
        command = { type: 'jumpTo', stepNumber: stepNumber - 1 };
      }
    }

    if (command) {
      setLastCommand(text);
      setShowCommandFeedback(true);
      onCommand(command);

      setTimeout(() => {
        setShowCommandFeedback(false);
      }, 2000);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSettings.speechRate;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 && voiceSettings.voiceIndex < voices.length) {
        utterance.voice = voices[voiceSettings.voiceIndex];
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-4 bg-amber-50 border-amber-300">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900">Voice Control Not Supported</h3>
            <p className="text-sm text-amber-700 mt-1">
              Your browser doesn't support voice recognition. Try using Chrome, Edge, or Safari on a desktop or mobile device.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={onToggle}
          size="lg"
          className={`relative flex-1 gap-3 transition-all ${
            isActive
              ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/50'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          {isActive ? (
            <>
              <div className="relative">
                <Mic className="w-5 h-5" />
                {isListening && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                )}
              </div>
              <span className="font-semibold">Voice Mode Active</span>
            </>
          ) : (
            <>
              <MicOff className="w-5 h-5" />
              <span className="font-semibold">Enable Voice Mode</span>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowHelp(!showHelp)}
          className="border-gray-300"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>

      {isActive && (
        <>
          {isListening && (
            <Card className="p-4 bg-orange-50 border-primary">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-1 h-8 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
                  <span className="w-1 h-8 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-1 h-8 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1 h-8 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Listening...</p>
                  {transcript && (
                    <p className="text-sm text-gray-700 mt-1">"{transcript}"</p>
                  )}
                </div>
                <Volume2 className="w-5 h-5 text-primary" />
              </div>
            </Card>
          )}

          {showCommandFeedback && lastCommand && (
            <Card className="p-3 bg-orange-50 border-primary animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                <p className="text-sm font-medium text-gray-900">
                  Command recognized: "{lastCommand}"
                </p>
              </div>
            </Card>
          )}

          {error && (
            <Card className="p-3 bg-red-50 border-red-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </Card>
          )}
        </>
      )}

      {permissionStatus === 'denied' && (
        <Card className="p-4 bg-amber-50 border-amber-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">Microphone Permission Required</h3>
              <p className="text-sm text-amber-700 mt-1">
                Please allow microphone access in your browser settings to use voice control.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Collapsible open={showHelp} onOpenChange={setShowHelp}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full text-sm text-gray-600 hover:text-gray-900">
            {showHelp ? 'Hide' : 'Show'} Voice Commands
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-3">Available Voice Commands:</h4>
            <div className="space-y-2">
              {commandExamples.map((cmd, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{cmd.text}</p>
                    <p className="text-xs text-gray-600">{cmd.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-4 pt-3 border-t border-blue-200">
              Tip: Speak clearly and naturally. Commands are automatically recognized.
            </p>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
