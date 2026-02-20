module.exports = {
  presets: [
    ['@babel/preset-env', {debug: false}],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic'
      }
    ],
    '@babel/preset-typescript'
  ],
  plugins: [
    "@babel/plugin-transform-runtime",
    "react-html-attrs",
  ],
  env: {
    test: {
      "plugins": [
        "@babel/plugin-transform-modules-commonjs",
        "dynamic-import-node"
      ]
    }
  }
};
