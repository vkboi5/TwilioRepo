import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import SignLanguageService from '../services/SignLanguageService';

interface SignLanguageAnimationProps {
  text: string;
  style?: object;
}

const SignLanguageAnimation: React.FC<SignLanguageAnimationProps> = ({ text, style }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [animationUrl, setAnimationUrl] = useState<string>('');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (text) {
      const url = SignLanguageService.getSignedPoseUrl(text);
      setAnimationUrl(url);
    }
  }, [text]);

  const htmlContent: string = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; overflow: hidden; background: transparent; }
          .container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
          model-viewer { width: 100%; height: 100%; --poster-color: transparent; }
        </style>
        <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
      </head>
      <body>
        <div class="container">
          <model-viewer id="avatar" camera-controls autoplay src="https://sign.mt/3d/character.glb" 
            ios-src="https://sign.mt/3d/character.usdz" alt="Sign language avatar">
          </model-viewer>
        </div>
        <script>
          const modelViewer = document.querySelector('#avatar');
          
          async function loadAnimation() {
            try {
              const poseUrl = "${animationUrl}";
              if (!poseUrl) return;
              
              const response = await fetch(poseUrl);
              const poseData = await response.json();
              
              window.ReactNativeWebView.postMessage('LOADED');
              
              if (modelViewer.model && poseData) {
                window.ReactNativeWebView.postMessage('ANIMATING');
              }
            } catch (error) {
              window.ReactNativeWebView.postMessage('ERROR: ' + error.message);
            }
          }
          
          modelViewer.addEventListener('load', loadAnimation);
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: WebViewMessageEvent): void => {
    const data = event.nativeEvent.data;
    if (data === 'LOADED') {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <ActivityIndicator 
          style={styles.loader} 
          size="large" 
          color="#0263E0" 
        />
      )}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => null}
        onError={(syntheticEvent) => console.error('WebView error:', syntheticEvent.nativeEvent)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 244, 246, 0.8)',
  },
});

export default SignLanguageAnimation;