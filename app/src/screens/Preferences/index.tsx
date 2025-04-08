import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types'; // Ensure this file exists and is properly defined

// Assets
const LinzoLogo = require('../../../assets/icons/linzo-logo.png');

const Preferences: React.FC = () => {
  const [preference, setPreference] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  const handleSelection = (option: string) => {
    setPreference(option);
    setShowOptions(true);
    Alert.alert('Preference Selected', `You selected: ${option}`);
  };

  const navigateToHome = () => {
    navigation.navigate('Home');
  };

  const navigateToDialer = () => {
    navigation.navigate('Dialer');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#F4F6F8' : 'transparent'}
      />
      {/* Header with Logo */}
      <View style={styles.headerContainer}>
        <Image source={LinzoLogo} style={styles.linzoLogo} resizeMode="contain" />
        <Text style={styles.title}>
          Set Your <Text style={styles.linzoText}>Preferences</Text>
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.body}>
        {!showOptions ? (
          <>
            <TouchableOpacity
              style={[
                styles.button,
                preference === 'Deaf' && styles.selectedButton,
              ]}
              onPress={() => handleSelection('Deaf')}
            >
              <Text style={styles.buttonText}>Deaf</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                preference === 'Mute' && styles.selectedButton,
              ]}
              onPress={() => handleSelection('Mute')}
            >
              <Text style={styles.buttonText}>Mute</Text>
            </TouchableOpacity>

            {preference && (
              <Text style={styles.selectedText}>
                Selected: <Text style={styles.selectedHighlight}>{preference}</Text>
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>What’s Next?</Text>

            <TouchableOpacity style={styles.button} onPress={navigateToHome}>
              <Text style={styles.buttonText}>Go to Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={navigateToDialer}>
              <Text style={styles.buttonText}>Make a Call</Text>
            </TouchableOpacity>
          </>
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
    backgroundColor: '#F4F6F8', // Soft gray-blue, consistent with app
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  linzoLogo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A3C6C', // Dark blue for readability
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  linzoText: {
    color: '#A286F6', // Purple from logo
  },
  body: {
    flex: 1,
    width: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666', // Subtle gray
    textAlign: 'center',
    marginBottom: 25,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  button: {
    backgroundColor: '#A286F6', // Purple to match logo
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginVertical: 12,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  selectedButton: {
    backgroundColor: '#8A6DE9', // Slightly darker purple for selection
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  selectedText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333', // Dark gray
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  selectedHighlight: {
    fontWeight: '600',
    color: '#A286F6', // Purple highlight
  },
  footer: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999', // Light gray
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
});

export default Preferences;