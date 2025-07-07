import {Component, inject, Input, OnDestroy, OnInit} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {debounce, distinctUntilChanged, skipWhile, takeUntil, tap, filter} from 'rxjs/operators';
import {interval, Observable, Subscription, of} from 'rxjs';
import {TranscriptionService, ConnectionStatus} from '../../../../modules/transcription/transcription.service';
import {
  SetSpokenLanguage,
  SetSpokenLanguageText,
  SuggestAlternativeText,
} from '../../../../modules/translate/translate.actions';
import {Store} from '@ngxs/store';
import {TranslateStateModel} from '../../../../modules/translate/translate.state';
import {BaseComponent} from '../../../../components/base/base.component';
import {IonButton, IonButtons, IonIcon, IonTextarea, IonToolbar} from '@ionic/angular/standalone';
import {SpeechToTextComponent} from '../../../../components/speech-to-text/speech-to-text.component';
import {TranslocoDirective, TranslocoPipe} from '@jsverse/transloco';
import {addIcons} from 'ionicons';
import {addOutline, sparkles, micOutline} from 'ionicons/icons';
import {AsyncPipe, DecimalPipe} from '@angular/common';
import {TextToSpeechComponent} from '../../../../components/text-to-speech/text-to-speech.component';
import {DesktopTextareaComponent} from './desktop-textarea/desktop-textarea.component';

@Component({
  selector: 'app-spoken-language-input',
  templateUrl: './spoken-language-input.component.html',
  styleUrls: ['./spoken-language-input.component.scss'],
  imports: [
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTextarea,
    DesktopTextareaComponent,
    SpeechToTextComponent,
    ReactiveFormsModule,
    TranslocoPipe,
    DecimalPipe,
    TextToSpeechComponent,
    AsyncPipe,
    TranslocoDirective,
  ],
})
export class SpokenLanguageInputComponent extends BaseComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private transcriptionService = inject(TranscriptionService);

  translate$!: Observable<TranslateStateModel>;
  text$!: Observable<string>;
  normalizedText$!: Observable<string>;

  text = new FormControl();
  maxTextLength = 500;
  detectedLanguage!: string;
  spokenLanguage!: string;
  isTranscriptionEnabled = false;
  transcriptionSubscription: Subscription | null = null;
  connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  lastReceivedMessage: any = null;

  @Input() isMobile = false;

  constructor() {
    super();
    this.translate$ = this.store.select<TranslateStateModel>(state => state.translate);
    this.text$ = this.store.select<string>(state => state.translate.spokenLanguageText);
    this.normalizedText$ = this.store.select<string>(state => state.translate.normalizedSpokenLanguageText);

    addIcons({sparkles, addOutline, micOutline});
  }

  ngOnInit() {
    this.translate$
      .pipe(
        tap(({spokenLanguage, detectedLanguage}) => {
          this.detectedLanguage = detectedLanguage;
          this.spokenLanguage = spokenLanguage ?? detectedLanguage;
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    // Local text changes
    this.text.valueChanges
      .pipe(
        debounce(() => interval(300)),
        skipWhile(text => !text), // Don't run on empty text, on app launch
        distinctUntilChanged((a, b) => a.trim() === b.trim()),
        tap(text => this.store.dispatch(new SetSpokenLanguageText(text))),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    this.text.valueChanges
      .pipe(
        debounce(() => interval(1000)),
        distinctUntilChanged((a, b) => a.trim() === b.trim()),
        tap(text => this.store.dispatch(new SuggestAlternativeText())),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    // Changes from the store
    this.text$
      .pipe(
        tap(text => this.text.setValue(text)),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.disconnectTranscription();
  }

  toggleTranscription() {
    if (this.isTranscriptionEnabled) {
      this.disconnectTranscription();
    } else {
      this.connectTranscription();
    }
    this.isTranscriptionEnabled = !this.isTranscriptionEnabled;
  }

  /**
   * Tests the WebSocket connection and logs the connection status and messages
   * Useful for debugging WebSocket connection issues
   */
  testWebSocketConnection() {
    this.connectionStatus = ConnectionStatus.CONNECTING;
    console.log('Testing WebSocket connection...');

    // First disconnect any existing connection
    this.disconnectTranscription();

    // Set up connection status subscription
    const statusSub = this.transcriptionService.connectionStatus$
      .pipe(
        tap(status => {
          this.connectionStatus = status;
          console.log(`WebSocket connection status: ${status}`);
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    // Set up raw data subscription for debugging
    const rawSub = this.transcriptionService.rawData$
      .pipe(
        filter(data => !!data),
        tap(data => {
          this.lastReceivedMessage = data;
          console.log('WebSocket received raw data:', data);

          try {
            // Attempt to parse the data if it's a string
            if (typeof data === 'string') {
              const parsed = JSON.parse(data);
              console.log('Parsed WebSocket data:', parsed);
            }
          } catch (e) {
            console.log('Could not parse data as JSON:', e);
          }
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    // Connect to the WebSocket
    this.transcriptionService.connect();

    // Store subscriptions for cleanup
    this.transcriptionSubscription = new Subscription();
    this.transcriptionSubscription.add(statusSub);
    this.transcriptionSubscription.add(rawSub);

    // For testing purposes, show as enabled
    this.isTranscriptionEnabled = true;
  }

  private connectTranscription() {
    this.connectionStatus = ConnectionStatus.CONNECTING;
    this.transcriptionService.connect();

    // Monitor connection status
    const statusSub = this.transcriptionService.connectionStatus$
      .pipe(
        tap(status => {
          this.connectionStatus = status;
          console.log(`WebSocket connection status: ${status}`);
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    // Subscribe to transcription data
    const dataSub = this.transcriptionService.transcription$
      .pipe(
        tap(message => {
          console.log('Received transcription message:', message);
          this.lastReceivedMessage = message;

          // Extract text from different possible formats
          let text = '';
          let isFinal = false;

          if (message) {
            // Handle TranscriptionMessage format with text field
            if (message.text) {
              text = message.text;
              isFinal = !!message.final;
            }
            // Handle plain string format
            else if (typeof message === 'string') {
              text = message;
              isFinal = true;
            }

            // Only proceed if we have text
            if (text && text.trim() !== '') {
              this.updateTextWithTranscription(text, isFinal);
            }
          }
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    // Subscribe to raw data for debugging and handling different formats
    const rawDataSub = this.transcriptionService.rawData$
      .pipe(
        filter(data => !!data),
        tap(rawData => {
          console.log('Raw transcription data:', rawData);

          try {
            // Handle string data
            if (typeof rawData === 'string') {
              try {
                // Try to parse as JSON
                const parsed = JSON.parse(rawData);
                if (parsed.transcription) {
                  // Server format with transcription field
                  const text = parsed.transcription;
                  if (text && text.trim() !== '') {
                    this.updateTextWithTranscription(text, true);
                  }
                }
              } catch (e) {
                // Not JSON, use raw text
                if (rawData && rawData.trim() !== '') {
                  this.updateTextWithTranscription(rawData, true);
                }
              }
            }
            // Handle object data directly
            else if (rawData && typeof rawData === 'object') {
              // Server format with transcription field
              if (rawData.transcription) {
                const text = rawData.transcription;
                if (text && text.trim() !== '') {
                  this.updateTextWithTranscription(text, true);
                }
              }
            }
          } catch (error) {
            console.error('Error processing raw transcription data:', error);
          }
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    // Store subscriptions for cleanup
    this.transcriptionSubscription = new Subscription();
    this.transcriptionSubscription.add(statusSub);
    this.transcriptionSubscription.add(dataSub);
    this.transcriptionSubscription.add(rawDataSub);
  }

  private disconnectTranscription() {
    if (this.transcriptionSubscription) {
      this.transcriptionSubscription.unsubscribe();
      this.transcriptionSubscription = null;
      this.transcriptionService.disconnect();
      this.connectionStatus = ConnectionStatus.DISCONNECTED;
      console.log('Disconnected from transcription service');
    }
  }

  /**
   * Gets the current connection status as a user-friendly string
   */
  getConnectionStatusText(): string {
    switch (this.connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'Connected';
      case ConnectionStatus.CONNECTING:
        return 'Connecting...';
      case ConnectionStatus.DISCONNECTED:
        return 'Disconnected';
      case ConnectionStatus.ERROR:
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  }

  /**
   * Logs the last received message and current connection state
   * Useful for debugging in the UI
   */
  logTranscriptionState(): void {
    console.group('Transcription State');
    console.log('Connection Status:', this.connectionStatus);
    console.log('Is Enabled:', this.isTranscriptionEnabled);
    console.log('Last Message:', this.lastReceivedMessage);
    console.groupEnd();
  }
  setText(text: string) {
    this.store.dispatch(new SetSpokenLanguageText(text));
  }

  setDetectedLanguage() {
    this.store.dispatch(new SetSpokenLanguage(this.detectedLanguage));
  }

  /**
   * Updates the text input with transcription data
   * @param text The transcription text
   * @param isFinal Whether this is a final transcription or interim
   */
  private updateTextWithTranscription(text: string, isFinal: boolean): void {
    if (!text || text.trim() === '') return;

    const currentText = this.text.value || '';
    let newText: string;

    // Handle based on 'final' property
    if (isFinal) {
      // This is a final transcription, append to existing text
      newText = currentText ? `${currentText} ${text}`.trim() : text.trim();
    } else {
      // This is an interim transcription, replace the entire text for simplicity
      newText = text.trim();
    }

    // Update the form control and dispatch the action
    this.text.setValue(newText);
    this.store.dispatch(new SetSpokenLanguageText(newText));
  }
}
