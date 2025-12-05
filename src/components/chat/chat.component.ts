import { Component, ChangeDetectionStrategy, signal, inject, computed, ViewChild, ElementRef, afterNextRender, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Feature, Message } from '../../models';
import { GeminiService } from '../../services/gemini.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// To handle vendor prefixes for SpeechRecognition
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onstart: () => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnDestroy {
  private geminiService = inject(GeminiService);
  private sanitizer = inject(DomSanitizer);
  private abortController: AbortController | null = null;
  private recognition: SpeechRecognition | null = null;

  @ViewChild('chatContainer') private chatContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('userInputElement') private userInputElement?: ElementRef<HTMLTextAreaElement>;

  features: {
    id: Feature;
    name: string;
    icon: SafeHtml;
    systemInstruction?: string;
    placeholder: string;
    examples: string[];
  }[] = [
    {
      id: 'chat',
      name: 'Chat',
      icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 2a.75.75 0 0 1 .75.75v.518a9 9 0 0 1 6.368 6.368h.518A.75.75 0 0 1 18 10a.75.75 0 0 1-.75.75h-.518a9 9 0 0 1-6.368 6.368v.518A.75.75 0 0 1 10 18a.75.75 0 0 1-.75-.75v-.518a9 9 0 0 1-6.368-6.368H2.382a.75.75 0 0 1 0-1.5h.518A9 9 0 0 1 9.25 3.268V2.75A.75.75 0 0 1 10 2ZM10 4.5a7.5 7.5 0 0 0-7.445 6.91L2.5 11.5v-3l.055.09A7.5 7.5 0 0 0 10 4.5Zm0 11a7.5 7.5 0 0 0 7.445-6.91L17.5 8.5v3l-.055-.09A7.5 7.5 0 0 0 10 15.5Z" clip-rule="evenodd" /></svg>'),
      systemInstruction: 'You are a friendly and helpful AI assistant. Be clear, concise, and engaging.',
      placeholder: 'Ask me anything, or use the mic...',
      examples: [
        'Explain quantum computing in simple terms',
        'What are the best parts of living on Mars?',
        'Suggest a few ideas for a 10-year-old’s birthday party',
        'Write a short poem about a robot who discovers music'
      ]
    },
    {
      id: 'code',
      name: 'Code',
      icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06ZM11.378 16.62a.75.75 0 0 1-1.042.158l-3.25-2.5a.75.75 0 0 1 .884-1.2l3.25 2.5a.75.75 0 0 1 .158 1.042Z" clip-rule="evenodd" /></svg>'),
      systemInstruction: 'You are an expert software developer. Provide clear, efficient, and well-documented code. Use markdown for code blocks.',
      placeholder: 'e.g., Write a python script to...',
      examples: [
        'Write a Python script to sort a list of dictionaries by a specific key',
        'How do I make a responsive navigation bar in CSS?',
        'Show me a TypeScript example of a generic function',
        'What is the difference between SQL and NoSQL databases?'
      ]
    },
    {
      id: 'translate',
      name: 'Translate',
      icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M7.5 2.75a.75.75 0 0 0-1.5 0V3.5h-1a.75.75 0 0 0 0 1.5h1v1.25a.75.75 0 0 0 1.5 0V5h1.25a.75.75 0 0 0 0-1.5H7.5V2.75Z" /><path fill-rule="evenodd" d="M3.5 7a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-2.121l-1.83 1.83a.75.75 0 0 1-1.06-1.06L5.188 7.5H3.5a.75.75 0 0 1-.75-.75ZM10 12.5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" /><path d="M9.44 9.138a.75.75 0 0 0-1.06 1.06l1.83 1.83-1.83 1.83a.75.75 0 1 0 1.06 1.06l1.83-1.83 1.83 1.83a.75.75 0 1 0 1.06-1.06L12.312 12l1.83-1.83a.75.75 0 1 0-1.06-1.06L11.25 10.94l-1.81-1.802Z" /></svg>'),
      systemInstruction: 'You are a translation expert. Translate the given text accurately. Identify the source language and translate to the target language specified by the user.',
      placeholder: 'e.g., Translate "hello world" to Spanish',
      examples: [
        'Translate "Where is the library?" to Japanese',
        'How do you say "I would like a coffee" in French?',
        'Translate the phrase "per aspera ad astra" from Latin',
        'What are some common greetings in German?'
      ]
    },
    {
      id: 'search',
      name: 'Search',
      icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>'),
      placeholder: 'Ask questions about recent events...',
      examples: [
        'Who won the latest Super Bowl?',
        'What are the top-grossing movies of this year?',
        'Summarize the latest advancements in AI',
        'What is the current weather in London?'
      ]
    },
  ];

  messages = signal<Message[]>([]);
  userInput = signal('');
  isLoading = signal(false);
  isListening = signal(false);
  speechRecognitionSupported = signal(false);
  selectedFeatureId = signal<Feature>('chat');

  currentFeature = computed(() => this.features.find(f => f.id === this.selectedFeatureId()));
  filteredMessages = computed(() => this.messages().filter(m => m.feature === this.selectedFeatureId()));

  constructor() {
    afterNextRender(() => {
      this.scrollToBottom();
      this.initializeSpeechRecognition();
    });
  }

  ngOnDestroy(): void {
    this.stopGeneration();
    if (this.recognition) {
        this.recognition.abort();
    }
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognitionSupported.set(true);
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // Stop listening after user stops talking
      this.recognition.interimResults = false; // Only get final results
      this.recognition.lang = 'en-US';

      // onstart is not used to set state, as it's handled synchronously in toggleVoiceInput to prevent race conditions.
      
      this.recognition.onend = () => this.isListening.set(false);
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isListening.set(false);
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.userInput.set(transcript);
        // Manually trigger input event for textarea auto-resize
        if (this.userInputElement) {
          this.adjustTextareaHeight({ target: this.userInputElement.nativeElement } as unknown as Event);
        }
      };
    } else {
        this.speechRecognitionSupported.set(false);
    }
  }

  toggleVoiceInput(): void {
    if (!this.recognition || this.isLoading()) return;

    if (this.isListening()) {
      this.recognition.stop();
    } else {
      this.userInput.set(''); // Clear previous input
      try {
        this.recognition.start();
        // Synchronously update state to provide immediate feedback and prevent race conditions.
        this.isListening.set(true);
      } catch (e) {
        console.error('Speech Recognition start error:', e);
        // If there was an error starting (e.g., already started), ensure state is not `listening`.
        this.isListening.set(false);
      }
    }
  }

  selectFeature(featureId: Feature): void {
    if (this.isLoading()) this.stopGeneration();
    this.selectedFeatureId.set(featureId);
    this.userInput.set('');
    this.focusInput();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  
  adjustTextareaHeight(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  useExample(prompt: string): void {
    this.userInput.set(prompt);
    this.sendMessage();
  }

  async sendMessage(): Promise<void> {
    const prompt = this.userInput().trim();
    const feature = this.currentFeature();
    if (!prompt || !feature || this.isLoading()) return;

    this.isLoading.set(true);
    this.userInput.set('');
    this.resetTextareaHeight();
    
    const userMessage: Message = { id: Date.now(), role: 'user', text: prompt, feature: feature.id };
    const modelMessage: Message = { id: Date.now() + 1, role: 'model', text: '', feature: feature.id, isLoading: true };
    this.messages.update(msgs => [...msgs, userMessage, modelMessage]);

    try {
        if (feature.id === 'search') {
            const result = await this.geminiService.generateWithSearch(prompt);
            this.messages.update(msgs => msgs.map(m => m.id === modelMessage.id ? { ...m, text: result.text, sources: result.sources, isLoading: false } : m));
        } else {
            this.abortController = new AbortController();
            const stream = await this.geminiService.generateTextStream(prompt, feature.systemInstruction ?? '');
            
            for await (const chunk of stream) {
                if (this.abortController.signal.aborted) break;
                const chunkText = chunk.text;
                this.messages.update(msgs => msgs.map(m => m.id === modelMessage.id ? {...m, text: m.text + chunkText } : m));
            }
            this.messages.update(msgs => msgs.map(m => m.id === modelMessage.id ? {...m, isLoading: false } : m));
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        this.messages.update(msgs => msgs.map(m => m.id === modelMessage.id ? { ...m, text: '', error: errorMessage, isLoading: false } : m));
    } finally {
        this.isLoading.set(false);
        this.abortController = null;
        this.focusInput();
    }
  }

  stopGeneration(): void {
    if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
    }
    this.isLoading.set(false);
    this.messages.update(msgs => msgs.map(m => m.isLoading ? { ...m, isLoading: false, text: m.text || "Generation stopped." } : m));
    this.focusInput();
  }

  private scrollToBottom(): void {
    try {
        if (this.chatContainer) {
            this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        }
    } catch (err) {
        console.error(err);
    }
  }

  private focusInput(): void {
    setTimeout(() => this.userInputElement?.nativeElement.focus(), 0);
  }

  private resetTextareaHeight(): void {
    if (this.userInputElement) {
        this.userInputElement.nativeElement.style.height = 'auto';
    }
  }
}
