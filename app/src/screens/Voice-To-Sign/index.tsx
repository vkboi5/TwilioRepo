import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useActiveCall } from '../../hooks/activeCall';
import { useDispatch, useSelector } from 'react-redux';
import { updateTranscription } from '../../store/voice/call/transcription';
import type { State } from '../../store/app';
import FastImage from 'react-native-fast-image';

// Assets
const LinzoLogo = require('../../../assets/icons/linzo-logo.png'); // Assuming same logo as Home

// GIF Constants
const helloGif = require('../../../gifs/Hello.gif');
const hruGif = require('../../../gifs/HowAreYou.gif');
const ilyGif = require('../../../gifs/ILY.gif');
const ntmyGif = require('../../../gifs/NiceToMeetYou.gif');
const tyGif = require('../../../gifs/ThankYou.gif');

// Function to get GIF and matched text based on transcription
const getGifFromTranscription = (transcription: string): { gif: any; matchedText: string } => {
  const lowerCaseTranscription = transcription.toLowerCase().trim();
  console.log('Processing transcription:', lowerCaseTranscription);

  if (lowerCaseTranscription.includes('thank you') || lowerCaseTranscription.includes('thank')) {
    console.log('Matched: thank/thank you');
    return { gif: tyGif, matchedText: 'Thank You' };
  } else if (
    lowerCaseTranscription.includes('nice to meet you') ||
    lowerCaseTranscription.includes('nice')
  ) {
    console.log('Matched: nice/nice to meet you');
    return { gif: ntmyGif, matchedText: 'Nice to Meet You' };
  } else if (
    lowerCaseTranscription.includes('i love you') ||
    lowerCaseTranscription.includes('love')
  ) {
    console.log('Matched: love/i love you');
    return { gif: ilyGif, matchedText: 'I Love You' };
  } else if (
    lowerCaseTranscription.includes('how are you') ||
    lowerCaseTranscription.includes('how')
  ) {
    console.log('Matched: how/how are you');
    return { gif: hruGif, matchedText: 'How Are You' };
  } else if (lowerCaseTranscription.includes('hello')) {
    console.log('Matched: hello');
    return { gif: helloGif, matchedText: 'Hello' };
  }

  console.log('No match found');
  return { gif: null, matchedText: '' };
};

const VoiceToSign = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionError, setConnectionError] = useState<string>('');
  const [gif, setGif] = useState<any>(null);
  const [matchedText, setMatchedText] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0)); // For text fade animation
  const activeCall = useActiveCall();
  const dispatch = useDispatch();

  const latestTranscript = useSelector(
    (state: State) =>
      state.voice.call.transcription[activeCall?.id || '']?.latestTranscript || '',
  );

  console.log('Active Call ID:', activeCall?.id);
  console.log('Latest Transcript from Redux:', latestTranscript);

  // Update GIF and matched text with animation
  useEffect(() => {
    if (latestTranscript) {
      const { gif: newGif, matchedText: newText } = getGifFromTranscription(latestTranscript);
      console.log('Setting GIF to:', newGif, 'Matched Text:', newText);

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setGif(newGif);
        setMatchedText(newText);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setGif(null);
      setMatchedText('');
    }
  }, [latestTranscript, fadeAnim]);

  // WebSocket connection logic
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

              if (data && data.transcription) {
                console.log('Dispatching updateTranscription with ID:', activeCall?.id);
                dispatch(
                  updateTranscription({
                    id: activeCall?.id || 'testId',
                    transcript: data.transcription,
                    detectedLanguage: data.detectedLanguage || 'en-IN',
                  }),
                );
              } else {
                console.warn('No transcription in data:', data);
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
        backgroundColor={Platform.OS === 'android' ? '#F4F4F6' : 'transparent'}
      />
      {/* Logo and Header Section */}
      <View style={styles.logoContainer}>
        <Image source={LinzoLogo} style={styles.linzoLogo} resizeMode="contain" />
        <Text style={styles.header}>
          Voice To <Text style={styles.linzoText}>Sign Language</Text>
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.body}>
        {connectionError ? (
          <Text style={styles.errorText}>{connectionError}</Text>
        ) : (
          <View style={styles.contentContainer}>
            {gif ? (
              <>
                <FastImage
                  source={gif}
                  style={styles.gifImage}
                  resizeMode="contain"
                />
                <Animated.View style={[styles.textCard, { opacity: fadeAnim }]}>
                  <Text style={styles.matchedText}>{matchedText}</Text>
                </Animated.View>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0263E0" />
                <Text style={styles.loadingText}>Listening for Signs...</Text>
              </View>
            )}
          </View>
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
    backgroundColor: '#F4F4F6', // Light gray from Home
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  linzoLogo: {
    width: 180,
    height: 180,
    marginBottom: 10,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  linzoText: {
    color: '#7d67f6', // Primary blue from Home
  },
  body: {
    flex: 2,
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifImage: {
    width: 280,
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 20,
  },
  textCard: {
    backgroundColor: '#FFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  matchedText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#7d67f6', // Primary blue
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#D32F2F', // Red from Home
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '500',
    color: '#666', // Subtle gray from Home
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#AAA', // Light gray from Home
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
});

export default VoiceToSign;