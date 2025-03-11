// app/src/screens/Transcription/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useActiveCall } from '../../hooks/activeCall';
import { useDispatch, useSelector } from 'react-redux';
import { updateTranscription } from '../../store/voice/call/transcription';
import type { State } from '../../store/app';

const TranscriptionScreen = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionError, setConnectionError] = useState<string>('');
  const activeCall = useActiveCall();
  const dispatch = useDispatch();

  const transcription = useSelector(
    (state: State) =>
      state.voice.call.transcription[activeCall?.id || '']?.transcript || '',
  );
  
  console.log('Active Call ID:', activeCall?.id);
  console.log('Transcription from Redux:', transcription);


  useEffect(() => {
    if (activeCall?.info?.state === 'connected') {
      console.log('Active Call:', activeCall);
      const wsUrl = __DEV__
        ? `wss://c504-2401-4900-1909-b804-5dcb-be56-8660-ab0e.ngrok-free.app/transcription` // Use ngrok URL
        : `wss://c504-2401-4900-1909-b804-5dcb-be56-8660-ab0e.ngrok-free.app/transcription`;

      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;

      const connectWebSocket = () => {
        try {
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            console.log('WebSocket Connected');
            setConnectionError('');
            setSocket(ws);
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log("Received WebSocket data:", data);
          
              // Adjust to use "transcription" if that's what the server sends
              if (data && data.transcription) {
                dispatch(
                  updateTranscription({
                    id: activeCall?.id, // Ensure you're using the correct ID
                    transcript: "This is a test transcription", // Use the correct property
                    detectedLanguage:'en-IN', // Default to 'en' if not provided
                  })
                );
              } else {
                console.warn('Received data does not contain transcription:', data);
              }
            } catch (error) {
              console.error('Failed to parse WebSocket message:', error);
            }
          };


          ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            setConnectionError('Connection error occurred');
          };

          ws.onclose = () => {
            console.log('WebSocket Closed');
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              console.log(
                `Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})`,
              );
              setTimeout(connectWebSocket, 2000); // Retry after 2 seconds
            }
          };

          return ws;
        } catch (error) {
          console.error('WebSocket connection error:', error);
          setConnectionError('Failed to connect to transcription service');
          return null;
        }
      };

      const ws = connectWebSocket();

      return () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    }
  }, [activeCall?.info?.state, activeCall?.id, dispatch]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Transcription</Text>
      {connectionError ? (
        <Text style={styles.errorText}>{connectionError}</Text>
      ) : (
        <ScrollView
          style={styles.transcriptionContainer}
          contentContainerStyle={styles.transcriptionContent}>
          {transcription.split('\n').map((line, index) => {
            const isUser = index % 2 === 0; // Alternate between user and other speaker
            return (
              <View
                key={index}
                style={[
                  styles.chatBubble,
                  isUser ? styles.userBubble : styles.otherBubble,
                ]}>
                <Text style={styles.speakerText}>
                  {isUser ? 'You:' : 'Caller:'}
                </Text>
                <Text style={styles.chatText}>{line}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#EAF3FF',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2B6CB0',
  },
  transcriptionContainer: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
  },
  transcriptionContent: {
    flexGrow: 1,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '75%',
  },
  userBubble: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: '#F1F0F0',
    alignSelf: 'flex-start',
  },
  speakerText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#555',
  },
  chatText: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default TranscriptionScreen;