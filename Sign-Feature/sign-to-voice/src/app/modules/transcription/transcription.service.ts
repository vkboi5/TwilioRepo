import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';

/**
 * Logging levels for the service
 */
enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

/**
 * Represents the current connection status of the WebSocket
 */
export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}
/**
 * Expected data format from the transcription WebSocket.
 *
 * The server is expected to send JSON objects with the following structure:
 * - transcription: The transcribed text
 * - sequenceId: Sequence identifier for the transcription
 *
 * Example:
 * {
 *   "transcription": "Hello world",
 *   "sequenceId": "12345"
 * }
 *
 * The service will also handle alternative formats including:
 * {
 *   "text": "Hello world",
 *   "timestamp": 1632145282123,
 *   "final": true
 * }
 *
 * However, the service is built to handle various formats and will attempt to
 * extract text content from different structures.
 */
export interface TranscriptionMessage {
  text: string;
  timestamp: number;
  final: boolean;
  sequenceId?: string; // Optional sequence ID from the server
}

@Injectable({
  providedIn: 'root',
})
export class TranscriptionService implements OnDestroy {
  private socket: WebSocket | null = null;
  private destroy$ = new Subject<void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds
  private wsUrl = 'wss://linzo-backend.onrender.com/transcription';
  private debugMode = true; // Set to true to enable verbose logging

  // BehaviorSubject to share the transcription data with components
  private transcriptionData = new BehaviorSubject<TranscriptionMessage | null>(null);
  private connectionState = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  private errorStatus = new BehaviorSubject<string | null>(null);
  private rawMessageData = new BehaviorSubject<any>(null);

  // Public observables that components can subscribe to
  public transcription$ = this.transcriptionData.asObservable();
  public connectionStatus$ = this.connectionState.asObservable();
  public error$ = this.errorStatus.asObservable();
  public rawData$ = this.rawMessageData.asObservable();

  // For backward compatibility (deprecated)
  public get connected$(): Observable<boolean> {
    console.warn('TranscriptionService: connected$ is deprecated, use connectionStatus$ instead');
    return this.connectionStatus$.pipe(
      takeUntil(this.destroy$),
      map(status => status === ConnectionStatus.CONNECTED)
    );
  }

  constructor() {
    this.log(LogLevel.INFO, 'TranscriptionService initialized');
  }

  /**
   * Enables or disables debug mode
   * @param enable Boolean to enable or disable debug mode
   */
  public setDebugMode(enable: boolean): void {
    this.debugMode = enable;
    this.log(LogLevel.INFO, `Debug mode ${enable ? 'enabled' : 'disabled'}`);
  }

  /**
   * Connects to the WebSocket server
   */
  public connect(url?: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.log(LogLevel.INFO, 'WebSocket is already connected');
      return;
    }

    // Clear any previous error
    this.errorStatus.next(null);
    // Update connection status to connecting
    this.connectionState.next(ConnectionStatus.CONNECTING);

    try {
      // Use provided URL or default
      this.wsUrl = url || this.wsUrl;
      this.log(LogLevel.INFO, `Connecting to WebSocket at ${this.wsUrl}`);
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.log(LogLevel.INFO, 'WebSocket connection established');
        this.connectionState.next(ConnectionStatus.CONNECTED);
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      };

      this.socket.onmessage = event => {
        try {
          // Log the raw data received for debugging
          this.log(LogLevel.INFO, `Raw WebSocket message received: ${event.data}`);

          // Emit the raw data for debugging purposes
          this.rawMessageData.next(event.data);

          let parsedData: any;
          let transcriptionMessage: TranscriptionMessage | null = null;

          // Check if data is a string that needs parsing or already an object
          if (typeof event.data === 'string') {
            try {
              parsedData = JSON.parse(event.data);
            } catch (parseError) {
              // If not valid JSON, use the raw string as text
              this.log(LogLevel.WARN, `Failed to parse message as JSON, using as raw text: ${parseError}`);
              parsedData = {text: event.data, timestamp: Date.now(), final: true};
            }
          } else {
            // Already parsed (e.g., if browser has auto-parsed JSON)
            parsedData = event.data;
          }

          // Now extract the transcription data from whatever format we received
          if (parsedData) {
            // Case 1: Data matches our expected format
            if (
              typeof parsedData.text === 'string' &&
              typeof parsedData.timestamp === 'number' &&
              typeof parsedData.final === 'boolean'
            ) {
              transcriptionMessage = parsedData as TranscriptionMessage;
            }
            // Case 2: Data has text but in different structure
            else if (typeof parsedData.text === 'string') {
              transcriptionMessage = {
                text: parsedData.text,
                timestamp: parsedData.timestamp || Date.now(),
                final: parsedData.final !== undefined ? parsedData.final : true,
              };
            }
            // Case 3: Data has transcript/transcription field instead of text (common server format)
            else if (typeof parsedData.transcript === 'string' || typeof parsedData.transcription === 'string') {
              this.log(
                LogLevel.INFO,
                `Found transcription field in data: "${parsedData.transcript || parsedData.transcription}"`
              );
              transcriptionMessage = {
                text: parsedData.transcript || parsedData.transcription,
                timestamp: parsedData.timestamp || Date.now(),
                final: parsedData.final !== undefined ? parsedData.final : true,
                sequenceId: parsedData.sequenceId || parsedData.SequenceId || undefined,
              };
            }
            // Case 4: Data is a string or has a message/content field
            else if (
              typeof parsedData === 'string' ||
              typeof parsedData.message === 'string' ||
              typeof parsedData.content === 'string'
            ) {
              const textContent =
                typeof parsedData === 'string' ? parsedData : parsedData.message || parsedData.content;

              transcriptionMessage = {
                text: textContent,
                timestamp: Date.now(),
                final: true,
              };
            }
            // Case 5: Fallback for unexpected format - try to extract anything usable
            else {
              const potentialText = this.extractTextFromUnknownFormat(parsedData);
              if (potentialText) {
                transcriptionMessage = {
                  text: potentialText,
                  timestamp: Date.now(),
                  final: true,
                };
              } else {
                this.log(LogLevel.ERROR, `Unknown data format received: ${JSON.stringify(parsedData)}`);
              }
            }

            if (transcriptionMessage) {
              this.log(LogLevel.INFO, `Processed transcription: ${JSON.stringify(transcriptionMessage)}`);
              this.transcriptionData.next(transcriptionMessage);
            } else {
              this.log(LogLevel.WARN, `Failed to extract transcription from: ${JSON.stringify(parsedData)}`);
            }
          }
        } catch (error) {
          const errorMsg = `Error processing WebSocket message: ${error}`;
          this.log(LogLevel.ERROR, errorMsg);
          this.errorStatus.next(errorMsg);
        }
      };

      this.socket.onerror = error => {
        const errorMsg = `WebSocket error: ${error}`;
        this.log(LogLevel.ERROR, errorMsg);
        this.errorStatus.next(errorMsg);
        this.connectionState.next(ConnectionStatus.ERROR);
      };

      this.socket.onclose = event => {
        const closeInfo = `WebSocket connection closed: Code=${event.code}, Reason=${event.reason || 'No reason provided'}`;
        this.log(LogLevel.INFO, closeInfo);

        // Check if closure was abnormal
        if (event.code !== 1000) {
          // 1000 is normal closure
          this.errorStatus.next(`Abnormal WebSocket closure: ${event.code}`);
          this.connectionState.next(ConnectionStatus.ERROR);
        } else {
          this.connectionState.next(ConnectionStatus.DISCONNECTED);
        }

        this.handleReconnection();
      };
    } catch (error) {
      const errorMsg = `Failed to create WebSocket connection: ${error}`;
      this.log(LogLevel.ERROR, errorMsg);
      this.errorStatus.next(errorMsg);
      this.connectionState.next(ConnectionStatus.ERROR);
      this.handleReconnection();
    }
  }

  /**
   * Disconnects from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connectionState.next(ConnectionStatus.DISCONNECTED);
    }
  }

  /**
   * Sends a message to the WebSocket server
   * @param message The message to send
   */
  public sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        this.socket.send(messageStr);
        this.log(LogLevel.DEBUG, `Sent message: ${messageStr}`);
      } catch (error) {
        const errorMsg = `Error sending WebSocket message: ${error}`;
        this.log(LogLevel.ERROR, errorMsg);
        this.errorStatus.next(errorMsg);
      }
    } else {
      const errorMsg = 'Cannot send message, WebSocket is not connected';
      this.log(LogLevel.ERROR, errorMsg);
      this.errorStatus.next(errorMsg);
    }
  }

  /**
   * Gets the current connection status
   * @returns Boolean indicating if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Handles reconnection logic when the WebSocket connection is closed
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);

      this.log(
        LogLevel.INFO,
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
      );

      setTimeout(() => {
        if (!this.isConnected()) {
          this.log(LogLevel.INFO, `Reconnecting attempt ${this.reconnectAttempts}...`);
          this.connect();
        }
      }, delay);
    } else {
      this.log(
        LogLevel.ERROR,
        `Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Please reconnect manually.`
      );
      this.errorStatus.next(
        `Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Please reconnect manually.`
      );
    }
  }

  /**
   * Extracts text from an unknown data format by recursively searching for string properties
   * @param data Unknown format data to process
   * @returns Extracted text string or null if no text could be found
   */
  private extractTextFromUnknownFormat(data: any): string | null {
    // If data is a string, return it
    if (typeof data === 'string' && data.trim().length > 0) {
      return data.trim();
    }

    // If data is null or undefined, return null
    if (data === null || data === undefined) {
      return null;
    }

    // If data is an array, check each item
    if (Array.isArray(data)) {
      for (const item of data) {
        const text = this.extractTextFromUnknownFormat(item);
        if (text) {
          return text;
        }
      }
      return null;
    }

    // If data is an object, look for common text properties first
    if (typeof data === 'object') {
      // Common property names that might contain text
      const textPropertyNames = [
        'transcription',
        'transcript',
        'text',
        'message',
        'content',
        'value',
        'speech',
        'result',
        'data',
        'body',
        'output',
      ];

      // Check for common property names first
      for (const prop of textPropertyNames) {
        if (prop in data && typeof data[prop] === 'string' && data[prop].trim().length > 0) {
          return data[prop].trim();
        }
      }

      // Check for nested "results" arrays common in speech recognition APIs
      if ('results' in data && Array.isArray(data.results)) {
        for (const result of data.results) {
          if (result.alternatives && Array.isArray(result.alternatives)) {
            for (const alt of result.alternatives) {
              if (typeof alt.transcript === 'string' && alt.transcript.trim().length > 0) {
                return alt.transcript.trim();
              }
            }
          }
          const text = this.extractTextFromUnknownFormat(result);
          if (text) {
            return text;
          }
        }
      }

      // Recursively check all properties
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const text = this.extractTextFromUnknownFormat(data[key]);
          if (text) {
            return text;
          }
        }
      }
    }

    return null;
  }

  /**
   * Log messages with different severity levels
   * @param level The log level (INFO, WARN, ERROR, DEBUG)
   * @param message The message to log
   */
  private log(level: LogLevel, message: string): void {
    // Always log errors and info, but only log other levels if debugMode is enabled
    if (level === LogLevel.ERROR || this.debugMode || level === LogLevel.INFO) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [TranscriptionService] [${level}] ${message}`;

      switch (level) {
        case LogLevel.ERROR:
          console.error(logMessage);
          break;
        case LogLevel.WARN:
          console.warn(logMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(logMessage);
          break;
        case LogLevel.INFO:
        default:
          console.log(logMessage);
          break;
      }
    }
  }

  /**
   * Cleanup resources when the service is destroyed
   */
  ngOnDestroy(): void {
    this.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Clears the current transcription data
   */
  public clearTranscription(): void {
    this.transcriptionData.next(null);
  }

  /**
   * Clears the stored raw message data
   */
  public clearRawData(): void {
    this.rawMessageData.next(null);
  }

  /**
   * Gets the current connection status as a string
   * @returns Current connection status
   */
  public getConnectionStatusString(): string {
    return this.connectionState.value;
  }
}
