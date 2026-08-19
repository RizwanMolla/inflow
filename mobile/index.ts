import { Buffer } from 'buffer';
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;

import { LogBox } from 'react-native';

// Suppress known React Native 0.76+ / Expo New Architecture SVG layout bubbling noise
LogBox.ignoreLogs([
  'Unsupported top level event type "topSvgLayout"',
  'topSvgLayout',
]);

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
