// // babel.config.js
// module.exports = function (api) {
//   api.cache(true);
//   return {
//     presets: [
//       ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
//       'nativewind/babel',
//     ],
//     plugins: [
//       require.resolve('expo-router/babel'),
//       // 📝 Do NOT put nativewind here
//       // 📝 Do NOT add react-native-reanimated/plugin here (Expo handles it)
//     ],
//   };
// };
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      require.resolve('expo-router/babel'),
      'nativewind/babel',
      'react-native-reanimated/plugin', // keep last if you use Reanimated
    ],
  };
};
