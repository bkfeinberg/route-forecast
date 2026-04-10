/* eslint-disable no-undef */
const { merge } = require('webpack-merge');
const common = require('./webpack.common.cjs');
const webpack = require('webpack');
const CompressionPlugin = require("compression-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const zlib = require("zlib");

module.exports = (env, argv) => merge(common(env, argv), {
    plugins: [
        new TerserPlugin({
            parallel: true,
            terserOptions: {
                ecma: 6,
                compress: {
                    ecma: 2021
                }
            },
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/,
        }),
        sentryWebpackPlugin({
            applicationKey: process.env.SENTRY_APP_ID,
            include: '.',
            ignoreFile: '.sentrycliignore',
            ignore: [
                'node_modules',
                'webpack.prod.js',
                'webpack.common.cjs',
                'webpack.dev.cjs',
                'setupFile.js'
            ],
            configFile: 'sentry.properties',
            rewrite: true,
            stripPrefix: ['/dist'],
            stripCommonPrefix: true,
            urlPrefix: '/static',
            debug: false,
            setCommits: { auto: true },
            authToken: process.env.SENTRY_AUTH_TOKEN,
            org: 'brian-feinberg',
            project: 'randoplan',
            deploy: { env: 'production', name: 'latest' },
            bundleSizeOptimizations: {
                excludeDebugStatements: true,
                // Only relevant if you added `browserTracingIntegration`
                // excludePerformanceMonitoring: true,
                // Only relevant if you added `replayIntegration`
                // excludeReplayIframe: true,
                excludeReplayShadowDom: true,
            }
        }),
        new CompressionPlugin({
            minRatio: 0.85,
            filename: "[path][base].br",
            algorithm: "brotliCompress",
            test: /\.(js|css|html|svg|ttf|eot)$/,
            compressionOptions: {
                params: {
                    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                }
            },
            exclude: [
                /\.png/,
                /\.ico/,
                /\.html/
            ]
        }),
        // new BundleAnalyzerPlugin()
    ],
    optimization: {
        minimizer: [
            `...`,
            new CssMinimizerPlugin(),
        ],
    },
    devtool: 'source-map'
});
