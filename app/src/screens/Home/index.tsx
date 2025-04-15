import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { StackNavigationProp } from '../types';
import { type Dispatch, type State } from '../../store/app';
import { logout } from '../../store/user';
import { unregister } from '../../store/voice/registration';

const PhoneDialer3D = require('../../../assets/icons/home-linzo.png');
const LinzoLogo = require('../../../assets/icons/linzo-logo.png');

const Home: React.FC = () => {
  const dispatch = useDispatch<Dispatch>();
  const user = useSelector((state: State) => state.user);
  const navigation = useNavigation<StackNavigationProp<'App'>>();

  const handleLogout = async () => {
    navigation.reset({ routes: [{ name: 'Sign In' }] });
    await dispatch(logout());
    await dispatch(unregister());
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#F4F6F8' : 'transparent'}
      />
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image source={LinzoLogo} style={styles.linzoLogo} resizeMode="contain" />
        <Text style={styles.greeting}>
          Welcome to <Text style={styles.linzoText}>Linzo</Text>
        </Text>
      </View>

      {/* 3D Dialer Image */}
      <View style={styles.header}>
        <Image source={PhoneDialer3D} style={styles.dialerImage} resizeMode="contain" />
      </View>

      {/* Body Section */}
      <View style={styles.body}>
        <Text style={styles.subGreeting}>Linzo, Your Call Companion</Text>
        {/* <View style={styles.userCard}>
          <Text style={styles.userLabel}>Logged in as:</Text>
          {user?.status === 'fulfilled' ? (
            <Text style={styles.userEmail}>{user.email}</Text>
          ) : (
            <Text style={styles.userEmail}>Guest User</Text>
          )}
        </View> */}

        {/* Buttons Section */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Explore Linzo</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
            <Text style={styles.secondaryButtonText}>Log Out</Text>
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ by Team Linzo</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8', // Consistent soft gray-blue
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  linzoLogo: {
    width: 120,
    height: 120,
    marginBottom: -5,
  },
  greeting: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1A3C6C', // Darker blue for readability
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  linzoText: {
    color: '#A286F6', // Purple from logo
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialerImage: {
    width: 300,
    height: 300,
    marginTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  body: {
    flex: 1,
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subGreeting: {
    fontSize: 18,
    fontWeight: '400',
    color: '#666', // Subtle gray
    textAlign: 'center',
    marginBottom: 25,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#A286F6', // Purple to match logo
    paddingVertical: 14,
    paddingHorizontal: 30, // Reduced width
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  footer: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999', // Lighter gray for consistency
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
});

export default Home;