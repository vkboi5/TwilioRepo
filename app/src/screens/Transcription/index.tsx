import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useActiveCall } from '../../hooks/activeCall';
import { useDispatch, useSelector } from 'react-redux';
import { updateTranscription } from '../../store/voice/call/transcription';
import type { State } from '../../store/app';

// Assets
const LinzoLogo = require('../../../assets/icons/linzo-logo.png');

const TranscriptionScreenDeaf = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionError, setConnectionError] = useState<string>('');
  const activeCall = useActiveCall();
  const dispatch = useDispatch();
  const processedIds = useRef<Set<string>>(new Set()); // Track processed sequence IDs

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
        ? `wss://4638-223-185-43-22.ngrok-free.app/transcription`
        : `wss://4638-223-185-43-22.ngrok-free.app/transcription`;

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
              console.log('Received WebSocket data:', data);

              if (data && data.transcription && data.sequenceId) {
                // Deduplicate using sequenceId
                if (!processedIds.current.has(data.sequenceId)) {
                  processedIds.current.add(data.sequenceId);
                  dispatch(
                    updateTranscription({
                      id: activeCall?.id,
                      transcript: data.transcription,
                      detectedLanguage: data.detectedLanguage || 'en-IN',
                    }),
                  );
                }
              } else if (data && data.transcription) {
                // Fallback: Process without sequenceId but warn
                console.warn('No sequenceId in data, processing without deduplication:', data);
                dispatch(
                  updateTranscription({
                    id: activeCall?.id,
                    transcript: data.transcription,
                    detectedLanguage: data.detectedLanguage || 'en-IN',
                  }),
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
              setTimeout(connectWebSocket, 2000);
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
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#F4F6F8' : 'transparent'}
      />
      {/* Header with Logo */}
      <View style={styles.headerContainer}>
        <Image source={LinzoLogo} style={styles.linzoLogo} resizeMode="contain" />
        <Text style={styles.header}>
          Real-Time <Text style={styles.linzoText}>Transcription</Text>
        </Text>
        <Text style={styles.subheader}>Speech-to-Text</Text>
      </View>

      {/* Transcription Content */}
      <View style={styles.body}>
        {connectionError ? (
          <Text style={styles.errorText}>{connectionError}</Text>
        ) : (
          <ScrollView
            style={styles.transcriptionContainer}
            contentContainerStyle={styles.transcriptionContent}
            showsVerticalScrollIndicator={false}
          >
            {transcription.split('\n').map((line, index) => {
              const isUser = index % 2 === 0; // Alternate between user and caller
              return (
                <View
                  key={`${index}-${line}`} // Unique key using index and line content
                  style={[
                    styles.chatBubble,
                    isUser ? styles.userBubble : styles.callerBubble,
                  ]}
                >
                  <Text style={styles.speakerText}>
                    {isUser ? 'You' : 'Caller'}
                  </Text>
                  <Text style={styles.chatText}>{line}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Linzo</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  linzoLogo: {
    width: 140,
    height: 140,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A3C6C',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  linzoText: {
    color: '#7d67f6',
  },
  subheader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7d77d5',
    textAlign: 'center',
    marginTop: 5,
  },
  body: {
    flex: 1,
    width: '100%',
  },
  transcriptionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  transcriptionContent: {
    paddingBottom: 10,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#e0daff',
    alignSelf: 'flex-end',
  },
  callerBubble: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
  },
  speakerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  chatText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#D32F2F',
    textAlign: 'center',
    marginVertical: 20,
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
});

export default TranscriptionScreenDeaf;