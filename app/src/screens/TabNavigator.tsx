import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActiveCallBanner from '../components/ActiveCallBanner';
import { useConnectedActiveCallBanner } from '../components/ActiveCallBanner/hooks';
import Home from './Home';
import Dialer from './Dialer';
import About from './About';
import { type TabParamList } from './types';
import { getEnvVariable } from '../util/env';
import Preferences from './Preferences';
import Transcription from './Transcription/index';
import VoiceToSign from './Voice-To-Sign/index';
import TextToSpeech from './TextToSpeech/index';
import Translation from './Translation/index'
const HomeSelectedSource = require('../../assets/icons/home-selected.png');
const DialpadSource = require('../../assets/icons/dialpad-dark.png');
const AboutSource = require('../../assets/icons/info.png');
const SettingsSource = require('../../assets/icons/settings.png');
const SignLanguageSource = require('../../assets/icons/sign-language.png');
const TypingSource = require('../../assets/icons/typing.png');
const TranscriptionSource = require('../../assets/icons/transcription.png');
const TranslationSource = require('../../assets/icons/translate.png');

const Tab = createBottomTabNavigator<TabParamList>();

const homeTabOptions: BottomTabNavigationOptions = {
  tabBarIcon: ({ focused, size }) => {
    return (
      <Image
        source={HomeSelectedSource}
        resizeMode="contain"
        style={{ maxHeight: size }}
      />
    );
  },
};

const preferencesTabOptions: BottomTabNavigationOptions = {
  tabBarIcon: ({ focused, size }) => {
    return (
      <Image
        source={SettingsSource}
        resizeMode="contain"
        style={{ maxHeight: size }}
      />
    );
  },
};

const dialerTabOptions: BottomTabNavigationOptions = {
  tabBarIcon: ({ focused, size }) => {
    return (
      <Image
        source={DialpadSource}
        resizeMode="contain"
        style={{ maxHeight: size }}
      />
    );
  },
  tabBarTestID: 'dialer_button',
};

const transcriptionTabOptions: BottomTabNavigationOptions = {
  tabBarIcon: ({ focused, size }) => {
    return (
      <Image
        source={TranscriptionSource}
        resizeMode="contain"
        style={{ maxHeight: size }}
      />
    );
  },
};

const voiceToSignTabOptions: BottomTabNavigationOptions = {
  tabBarIcon: ({ focused, size }) => {
    return (
      <Image
        source={SignLanguageSource}
        resizeMode="contain"
        style={{ maxHeight: size }}
      />
    );
  },
};

const textToSpeechTabOptions: BottomTabNavigationOptions = {
  tabBarIcon: ({ focused, size }) => {
    return (
      <Image
        source={TypingSource}
        resizeMode="contain"
        style={{ maxHeight: size }}
      />
    );
  },
};

const translationTabOptions: BottomTabNavigationOptions = {
  tabBarIcon: ({ focused, size }) => {
    return (
      <Image
        source={TranslationSource}
        resizeMode="contain"
        style={{ maxHeight: size }}
      />
    );
  },
};


const aboutTabOptions: BottomTabNavigationOptions = {
  tabBarIcon: ({ focused, size }) => {
    return (
      <Image
        source={AboutSource}
        resizeMode="contain"
        style={{ maxHeight: size }}
      />
    );
  },
};

const TabNavigator: React.FC = () => {
  const bannerProps = useConnectedActiveCallBanner();
  const isAboutPageEnabled = React.useMemo(() => {
    return getEnvVariable('ENABLE_ABOUT_PAGE') === 'true';
  }, []);
  const safeAreaInsets = useSafeAreaInsets();

  const screen = React.useMemo(
    () => (
      <View style={styles.screens}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
          }}>
          <Tab.Screen name="Home" component={Home} options={homeTabOptions} />
          <Tab.Screen
            name="Preferences"
            component={Preferences}
            options={preferencesTabOptions}
          />
          <Tab.Screen
            name="Transcription Screen"
            component={Transcription}
            options={transcriptionTabOptions}
          />
          <Tab.Screen
            name="Dialer"
            component={Dialer}
            options={dialerTabOptions}
          />
          <Tab.Screen
            name="Voice To Sign"
            component={VoiceToSign}
            options={voiceToSignTabOptions}
          />
          <Tab.Screen
            name="Text To Speech"
            component={TextToSpeech}
            options={textToSpeechTabOptions}
          />
          <Tab.Screen
            name="Translation"
            component={Translation}
            options={translationTabOptions}
          />
          {isAboutPageEnabled && (
            <Tab.Screen
              name="About"
              component={About}
              options={aboutTabOptions}
            />
          )}
        </Tab.Navigator>
      </View>
    ),
    [isAboutPageEnabled],
  );

  return (
    <View
      style={{
        ...styles.container,
        paddingTop: safeAreaInsets.top,
      }}>
      <ActiveCallBanner {...bannerProps} />
      {screen}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  screens: {
    flexGrow: 1,
  },
});

export default TabNavigator;