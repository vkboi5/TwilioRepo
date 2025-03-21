import { type CompositeNavigationProp } from '@react-navigation/native';
import {
  type NativeStackScreenProps,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {
  type BottomTabScreenProps,
  type BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';

export type StackParamList = {
  App: { screen: keyof TabParamList };
  Busy: undefined;
  Call: { callSid?: string };
  'Sign In': undefined;
  'Incoming Call': undefined;
  'Transcription Screen': undefined;
};

export type StackScreenProps<T extends keyof StackParamList> =
  NativeStackScreenProps<StackParamList, T>;

export type TabParamList = {
  Home: undefined;
  Dialer: undefined;
  About: undefined;
  Transcription: undefined;
};

export type TabNavScreenProps<T extends keyof TabParamList> =
  BottomTabScreenProps<TabParamList, T>;

export type StackNavigationProp<T extends keyof StackParamList> =
  CompositeNavigationProp<
    NativeStackNavigationProp<StackParamList, T>,
    BottomTabNavigationProp<TabParamList>
  >;
