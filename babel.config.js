module.exports = {
  presets: [
    ['@babel/preset-env', {
      debug: false,
      "useBuiltIns": "usage",
      "corejs": "3"
    }],
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
  "sourceMaps": "both",
  env: {
    test: {
      "plugins": [
        "@babel/plugin-transform-modules-commonjs",
        "dynamic-import-node"
      ]
    }
  }
};
