const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves buffer polyfill
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer'),
};

// Ensure Metro only resolves modules inside mobile/node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Block Metro from watching parent node_modules
config.resolver.blockList = [
  new RegExp(path.resolve(__dirname, '..', 'node_modules').replace(/[/\\\\]/g, '[/\\\\]')),
];

module.exports = config;
