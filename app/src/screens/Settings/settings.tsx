// src/screens/SettingsScreen.js (React Native)
import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Correct import for Picker
import AsyncStorage from '@react-native-async-storage/async-storage'; // For persistent storage

const languages = [
  { label: 'Hindi', value: 'hi-IN' },
  { label: 'English', value: 'en-US' },
  { label: 'Japanese', value: 'ja-JP' },
];

const SettingsScreen = ({ navigation }) => {
  const [preferredLanguage, setPreferredLanguage] = useState('en-US');

  const saveLanguage = async () => {
    try {
      await AsyncStorage.setItem('preferredLanguage', preferredLanguage);
      alert('Language preference saved!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Select your preferred language:</Text>
      <Picker
        selectedValue={preferredLanguage}
        onValueChange={(value) => setPreferredLanguage(value)}
        style={{ height: 50, width: 200 }}
      >
        {languages.map((lang) => (
          <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
        ))}
      </Picker>
      <Button title="Save" onPress={saveLanguage} />
    </View>
  );
};

export default SettingsScreen;