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
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useActiveCall } from '../../hooks/activeCall';
import { useSelector } from 'react-redux';
import type { State } from '../../store/app';

// Assets
const LinzoLogo = require('../../../assets/icons/linzo-logo.png');

const TranscriptionScreen = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionError, setConnectionError] = useState<string>('');
  const [inputText, setInputText] = useState<string>(''); // For TTS input
  const [messages, setMessages] = useState<
    { text: string; sender: 'Caller' | 'You'; timestamp: number; sequenceId?: string }[]
  >([]); // Unified message array with timestamps and sequenceId
  const activeCall = useActiveCall();
  const scrollViewRef = useRef<ScrollView>(null); // For auto-scrolling
  const processedIds = useRef<Set<string>>(new Set()); // Track processed sequence IDs

  const transcription = useSelector(
    (state: State) =>
      state.voice.call.transcription[activeCall?.id || '']?.transcript || '',
  );

  console.log('Active Call ID:', activeCall?.id);
  console.log('Call State:', activeCall?.info?.state);
  console.log('Transcription from Redux:', transcription);

  // WebSocket connection with reconnection
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      if (activeCall?.info?.state === 'connected' && !socket) {
        const wsUrl = __DEV__
          ? `wss://4638-223-185-43-22.ngrok-free.app/transcription`
          : `wss://4638-223-185-43-22.ngrok-free.app/transcription`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket Connected');
          setConnectionError('');
          setSocket(ws);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket data:', data);
            if (data.transcription && data.sequenceId) {
              // Use sequenceId to deduplicate messages
              if (!processedIds.current.has(data.sequenceId)) {
                processedIds.current.add(data.sequenceId);
                setMessages((prev) => [
                  ...prev,
                  {
                    text: data.transcription,
                    sender: 'Caller',
                    timestamp: Date.now(),
                    sequenceId: data.sequenceId,
                  },
                ]);
              }
            } else if (data.transcription) {
              // Fallback deduplication by text if no sequenceId
              setMessages((prev) => {
                const exists = prev.some(
                  (msg) => msg.text === data.transcription && msg.sender === 'Caller',
                );
                if (!exists) {
                  return [...prev, { text: data.transcription, sender: 'Caller', timestamp: Date.now() }];
                }
                return prev;
              });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket Error:', error);
          setConnectionError('Failed to connect to WebSocket server.');
        };

        ws.onclose = (event) => {
          console.log('WebSocket Closed', { code: event.code, reason: event.reason });
          setSocket(null);
          if (activeCall?.info?.state === 'connected') {
            setTimeout(connectWebSocket, 1000); // Reconnect after 1 second
          }
        };
      }
    };

    connectWebSocket();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [activeCall?.info?.state, socket]);

  // Send text for TTS and add to conversation
  const handleSendText = () => {
    if (!activeCall?.info?.sid) {
      Alert.alert('Error', 'No active call detected.');
      return;
    }
    if (!socket) {
      Alert.alert('Error', 'WebSocket is not initialized.');
      return;
    }
    if (socket.readyState !== WebSocket.OPEN) {
      Alert.alert('Error', 'WebSocket is not open. State: ' + socket.readyState);
      return;
    }
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter text to send.');
      return;
    }

    const message = {
      type: 'tts',
      text: inputText,
      callSid: activeCall.info.sid,
    };
    console.log('Sending TTS:', message);
    socket.send(JSON.stringify(message));
    setMessages((prev) => [...prev, { text: inputText, sender: 'You', timestamp: Date.now() }]);
    setInputText('');
  };

  // Auto-scroll to the latest message
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Sort messages by timestamp for chronological order
  const sortedConversation = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#F4F6F8' : 'transparent'}
      />
      <View style={styles.headerContainer}>
        <Image source={LinzoLogo} style={styles.linzoLogo} resizeMode="contain" />
        <Text style={styles.header}>
          Real-Time <Text style={styles.linzoText}>Transcription</Text>
        </Text>
        <Text style={styles.subheader}>Speech-to-Text & Text-to-Speech</Text>
      </View>

      <View style={styles.body}>
        {connectionError ? (
          <Text style={styles.errorText}>{connectionError}</Text>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.transcriptionContainer}
            contentContainerStyle={styles.transcriptionContent}
            showsVerticalScrollIndicator={false}
          >
            {sortedConversation.map((item, index) => (
              <View
                key={`${item.sender}-${item.timestamp}-${index}`} // Unique key
                style={[
                  styles.chip,
                  item.sender === 'You' ? styles.sentChip : styles.receivedChip,
                ]}
              >
                <Text style={styles.chipSender}>{item.sender}:</Text>
                <Text style={styles.chipText}>{item.text}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type to speak..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!activeCall?.info?.state === 'connected' || !socket || socket.readyState !== WebSocket.OPEN) &&
              styles.sendButtonDisabled,
          ]}
          onPress={handleSendText}
          disabled={
            !activeCall?.info?.state === 'connected' || !socket || socket.readyState !== WebSocket.OPEN
          }
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

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
    width: 100,
    height: 100,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A3C6C',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  linzoText: {
    color: '#A286F6',
  },
  subheader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 8,
    maxWidth: '80%',
    borderWidth: 1,
  },
  receivedChip: {
    backgroundColor: '#E6F0FA',
    borderColor: '#B3CDE0',
    alignSelf: 'flex-start',
  },
  sentChip: {
    backgroundColor: '#D1C4E9',
    borderColor: '#A286F6',
    alignSelf: 'flex-end',
  },
  chipSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3C6C',
    marginRight: 6,
  },
  chipText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    flexShrink: 1,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#D32F2F',
    textAlign: 'center',
    marginVertical: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#A286F6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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

export default TranscriptionScreen;