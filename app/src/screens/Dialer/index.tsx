import React from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Text,
  TouchableOpacity,
} from 'react-native';
import BackspaceButton from './BackspaceButton';
import MakeCallButton from '../../components/Call/MakeCallButton';
import ToggleClientInputButton from './ToggleClientInputButton';
import Dialpad from '../../components/Dialpad';
import OutgoingRemoteParticipant from './OutgoingRemoteParticipant';
import useDialer from './hooks';
import { useActiveCall } from '../../hooks/activeCall';
import { useNavigation } from '@react-navigation/native';

const LinzoLogo = require('../../../assets/icons/linzo-logo.png');

const Dialer: React.FC = () => {
  const { dialpad, makeCall, outgoing, recipientToggle } = useDialer();
  const activeCall = useActiveCall();
  const navigation = useNavigation();

  const backspaceButton = React.useMemo(
    () =>
      dialpad.backspace.isDisabled ? (
        <View style={styles.emptyButton} />
      ) : (
        <BackspaceButton onPress={dialpad.backspace.handle} />
      ),
    [dialpad.backspace.isDisabled, dialpad.backspace.handle],
  );

  // Check if call is connected
  const isCallConnected = activeCall?.info?.state === 'connected';

  const handleStartTranslation = () => {
    if (isCallConnected && activeCall?.info?.sid) {
      navigation.navigate('Translation', {
        callSid: activeCall.info.sid,
        enableTranslation: true,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#F4F6F8' : 'transparent'}
      />
      <View style={styles.headerContainer}>
        <Image source={LinzoLogo} style={styles.linzoLogo} resizeMode="contain" />
      </View>

      <View style={styles.remoteParticipant}>
        <OutgoingRemoteParticipant
          outgoingIdentity={outgoing.client.value}
          outgoingNumber={outgoing.number.value}
          recipientType={recipientToggle.type}
          setOutgoingIdentity={outgoing.client.setValue}
        />
      </View>

      <View style={styles.dialpadContainer}>
        <Dialpad
          disabled={dialpad.input.isDisabled}
          onPress={dialpad.input.handle}
        />
      </View>

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

      <TouchableOpacity
        style={[
          styles.translateButton,
          !isCallConnected && styles.translateButtonDisabled,
        ]}
        onPress={handleStartTranslation}
        disabled={!isCallConnected}
      >
        <Text style={styles.translateButtonText}>Start Translation</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  linzoLogo: {
    width: 100,
    height: 75,
    marginBottom: -15,
  },
  remoteParticipant: {
    width: '90%',
    padding: 15,
    marginBottom: 20,
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
    marginBottom: 10,
  },
  emptyButton: {
    width: 80,
  },
  translateButton: {
    backgroundColor: '#A286F6',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  translateButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  translateButtonText: {
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

export default Dialer;