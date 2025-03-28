import React from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Text,
} from 'react-native';
import BackspaceButton from './BackspaceButton';
import MakeCallButton from '../../components/Call/MakeCallButton';
import ToggleClientInputButton from './ToggleClientInputButton';
import Dialpad from '../../components/Dialpad';
import OutgoingRemoteParticipant from './OutgoingRemoteParticipant';
import useDialer from './hooks';

// Assets
const LinzoLogo = require('../../../assets/icons/linzo-logo.png'); // Same logo as other screens

const Dialer: React.FC = () => {
  const { dialpad, makeCall, outgoing, recipientToggle } = useDialer();

  const backspaceButton = React.useMemo(
    () =>
      dialpad.backspace.isDisabled ? (
        <View style={styles.emptyButton} />
      ) : (
        <BackspaceButton onPress={dialpad.backspace.handle} />
      ),
    [dialpad.backspace.isDisabled, dialpad.backspace.handle],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#F4F6F8' : 'transparent'}
      />
      {/* Header with Logo */}
      <View style={styles.headerContainer}>
        <Image source={LinzoLogo} style={styles.linzoLogo} resizeMode="contain" />
      </View>

      {/* Remote Participant */}
      <View style={styles.remoteParticipant}>
        <OutgoingRemoteParticipant
          outgoingIdentity={outgoing.client.value}
          outgoingNumber={outgoing.number.value}
          recipientType={recipientToggle.type}
          setOutgoingIdentity={outgoing.client.setValue}
        />
      </View>

      {/* Dialpad */}
      <View style={styles.dialpadContainer}>
        <Dialpad
          disabled={dialpad.input.isDisabled}
          onPress={dialpad.input.handle}
        />
      </View>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        <ToggleClientInputButton
          disabled={recipientToggle.isDisabled}
          onPress={recipientToggle.handle}
          recipientType={recipientToggle.type}
        />
        <MakeCallButton
          disabled={makeCall.isDisabled}
          onPress={makeCall.handle}
        />
        {backspaceButton}
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
    backgroundColor: '#F4F6F8', // Soft gray-blue, consistent with other screens
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  linzoLogo: {
    width: 100,
    height:75,
    marginBottom: 5,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A3C6C', // Darker blue for readability
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  linzoText: {
    color: '#0263E0', // Linzo blue accent
  },
  remoteParticipant: {
    width: '90%',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  dialpadContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 10,
  },
  emptyButton: {
    width: 80, // Adjusted for balance
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999', // Light gray
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
});

export default Dialer;