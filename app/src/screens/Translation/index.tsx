import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useActiveCall } from '../../hooks/activeCall';
import { useDispatch, useSelector } from 'react-redux';
import { setPreferredLanguage } from '../../store/voice/call/languagePreferences';
import type { State } from '../../store/app';
import { Picker } from '@react-native-picker/picker';

// Assets
const LinzoLogo = require('../../../assets/icons/linzo-logo.png');

// Translation Map
const translationMap: Record<string, { 'hi-IN': string; 'ja-JP': string }> = {
  hi: {
    'hi-IN': 'नमस्ते',
    'ja-JP': 'こんにちは',
  },
  'how are you': {
    'hi-IN': 'आप कैसे हैं?',
    'ja-JP': '元気ですか？',
  },
  'can you hear me': {
    'hi-IN': 'क्या आप मुझे सुन सकते हैं?',
    'ja-JP': '聞こえますか？',
  },
  'nice to meet you': {
    'hi-IN': 'आपसे मिलकर खुशी हुई',
    'ja-JP': '初めまして',
  },
};

// Supported languages
const supportedLanguages = [
  { code: 'en-US', name: 'English' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ja-JP', name: 'Japanese' },
];

// Function to get translation based on transcription
const getTranslationFromTranscription = (
  transcription: string,
  targetLanguage: string,
): { originalText: string; translatedText: string } => {
  const lowerCaseTranscription = transcription.toLowerCase().trim();
  console.log('Processing transcription:', lowerCaseTranscription);

  const phrases = [
    'nice to meet you',
    'can you hear me',
    'how are you',
    'hi',
  ];

  for (const phrase of phrases) {
    if (lowerCaseTranscription.includes(phrase)) {
      console.log(`Matched: ${phrase}`);
      const translatedText =
        targetLanguage === 'en-US'
          ? phrase
          : translationMap[phrase]?.[targetLanguage] || phrase;
      return {
        originalText: phrase,
        translatedText,
      };
    }
  }

  console.log('No match found');
  return { originalText: '', translatedText: '' };
};

const Translation: React.FC = ({ route }) => {
  const [connectionError, setConnectionError] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const activeCall = useActiveCall(route?.params?.callSid);
  const dispatch = useDispatch();

  const languagePreferences = useSelector((state: State) => state.languagePreferences);
  const preferredLanguage = languagePreferences?.preferredLanguage || 'en-US';
  const latestTranscript = useSelector(
    (state: State) =>
      state.voice?.call?.transcription?.[activeCall?.id || '']?.transcript || '',
  );

  const [selectedLanguage, setSelectedLanguage] = useState(preferredLanguage);

  console.log('Active Call ID:', activeCall?.id);
  console.log('Latest Transcript from Redux:', latestTranscript);
  console.log('Selected Language:', selectedLanguage);
  console.log('Language Preferences:', languagePreferences);

  // Language preference update
  useEffect(() => {
    if (selectedLanguage !== preferredLanguage) {
      dispatch(setPreferredLanguage(selectedLanguage));
    }
  }, [selectedLanguage, preferredLanguage, dispatch]);

  // Transcription update
  useEffect(() => {
    if (latestTranscript) {
      const { originalText: newOriginal, translatedText: newTranslated } =
        getTranslationFromTranscription(latestTranscript, selectedLanguage);
      console.log('Setting Original:', newOriginal, 'Translated:', newTranslated);

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setOriginalText(newOriginal);
        setTranslatedText(newTranslated);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setOriginalText('');
      setTranslatedText('');
    }
  }, [latestTranscript, selectedLanguage, fadeAnim]);

  // Call connection status
  useEffect(() => {
    if (activeCall?.info?.state === 'connected') {
      console.log('Active Call:', activeCall);
      setConnectionError('');
    }
  }, [activeCall?.info?.state, activeCall?.id]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#FFFFFF' : 'transparent'}
      />
      <View style={styles.logoContainer}>
        <Image source={LinzoLogo} style={styles.linzoLogo} resizeMode="contain" />
        <Text style={styles.header}>
          Real-Time <Text style={styles.linzoText}>Translation</Text>
        </Text>
      </View>

      <View style={styles.languagePickerContainer}>
        <Text style={styles.subheader}>Choose Language</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedLanguage}
            style={styles.languagePicker}
            onValueChange={(itemValue) => setSelectedLanguage(itemValue)}
            dropdownIconColor="#A286F6"
          >
            {supportedLanguages.map((lang) => (
              <Picker.Item
                key={lang.code}
                label={lang.name}
                value={lang.code}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.body}>
        {connectionError ? (
          <Text style={styles.errorText}>{connectionError}</Text>
        ) : (
          <View style={styles.contentContainer}>
            <ScrollView
              style={styles.conversationContainer}
              contentContainerStyle={styles.conversationContent}
              showsVerticalScrollIndicator={false}
            >
              {originalText && translatedText ? (
                <>
                  <Animated.View
                    style={[styles.chatBubble, styles.originalBubble, { opacity: fadeAnim }]}
                  >
                    <Text style={styles.speakerText}>Caller</Text>
                    <Text style={styles.chatText}>{originalText}</Text>
                  </Animated.View>
                  <Animated.View
                    style={[styles.chatBubble, styles.translatedBubble, { opacity: fadeAnim }]}
                  >
                    <Text style={styles.speakerText}>You</Text>
                    <Text style={styles.chatText}>{translatedText}</Text>
                  </Animated.View>
                </>
              ) : (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingArc} />
                  <Text style={styles.loadingText}>Listening for Speech...</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 30 : 20,
    marginBottom: 10,
  },
  linzoLogo: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  linzoText: {
    color: '#A286F6',
    fontWeight: '900',
  },
  languagePickerContainer: {
    width: '90%',
    marginVertical: 15,
  },
  subheader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  pickerWrapper: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  languagePicker: {
    flex: 1,
    height: 48,
    color: '#1A1A1A',
  },
  pickerItem: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: '#1A1A1A',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
  },
  body: {
    flex: 1,
    width: '90%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginVertical: 20,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    flex: 1,
  },
  conversationContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    width: '100%',
  },
  conversationContent: {
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
  originalBubble: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
  },
  translatedBubble: {
    backgroundColor: '#A286F6',
    alignSelf: 'flex-end',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingArc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#A286F6',
    borderTopColor: 'transparent',
    marginBottom: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#777',
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default Translation;