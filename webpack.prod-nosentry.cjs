/* eslint-disable no-undef */
const { merge } = require('webpack-merge');
const common = require('./webpack.common.cjs');
const webpack = require('webpack');
const CompressionPlugin = require("compression-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');
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
        })
    ],
    optimization: {
        minimizer: [
            `...`,
            new CssMinimizerPlugin(),
        ],
    },
    devtool: 'source-map'
});
