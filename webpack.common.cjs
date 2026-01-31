/* eslint-disable no-undef */
const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { InjectManifest } = require('workbox-webpack-plugin');

const APP_DIR = path.resolve(__dirname, 'src/jsx');
const TEMPLATE_DIR = path.resolve(__dirname, 'src/templates');
const SRC_STATIC_DIR = path.resolve(__dirname, 'src/static');
const BUILD_DIR = path.resolve(__dirname, 'dist');
const STATIC_DIR = path.resolve(BUILD_DIR, 'static');
const SERVER_DIR = path.resolve(BUILD_DIR, 'server');
const VIEWS_DIR = path.resolve(SERVER_DIR, 'views');
var webpack = require('webpack');

module.exports = (env, argv) => {
    const mode = argv === undefined ? 'development' : argv.mode;
    const devMode = process.env.NODE_ENV !== "production"
    return {
        mode: mode,
        cache: {
            type: 'filesystem'
        },
        entry: {main: path.resolve(APP_DIR, 'app/app.tsx'), visualize: path.resolve(APP_DIR, 'app/visualize.tsx')},
        module: {
            rules: [
                {
                    test: /\.(js|css|scss)$/,
                    enforce: "pre",
                    use: [{ loader: "source-map-loader" }],
                    "exclude": [
                        path.join(process.cwd(), 'node_modules/react-responsive'),
                    ],
                },
                {
                    test: /\.(t|j)sx?$/,
                    use: { loader: 'ts-loader' },
                    exclude: [
                        /node_modules/,
                        /\.test\.tsx$/,
                        /test-utils\.tsx$/

                    ]
                },
                {
                    test: /\.scss$/,
                    use: [
                        devMode ? "style-loader" : MiniCssExtractPlugin.loader, // creates style nodes from JS strings
                        {
                            loader:"css-loader", // translates CSS into CommonJS
                            options:{
                                modules: true, // Enable CSS Modules
                                importLoaders: 1, // Number of loaders applied before css-loader                                
                            }
                        },                        
                        "sass-loader" // compiles Sass to CSS, using Node Sass by default
                    ]
                },
                {
                    test: /\.module\.css$/,
                    use: [
                        devMode ? "style-loader" : MiniCssExtractPlugin.loader, // creates style nodes from JS strings
                        {
                            loader:"css-loader", // translates CSS into CommonJS
                            options:{
                                modules: true, // Enable CSS Modules
                                importLoaders: 2, // Number of loaders applied before css-loader                                
                            }
                        },                        
                    ]
                },
                {
                    test: /\.css$/,
                    exclude: /\.module\.css$/,
                    use: [
                        devMode ? "style-loader" : MiniCssExtractPlugin.loader, // creates style nodes from JS strings
                        {
                            loader:"css-loader", // translates CSS into CommonJS
                            options:{
                                modules: false, // Enable CSS Modules
                                importLoaders: 2, // Number of loaders applied before css-loader                                
                            }
                        },                        
                    ]
                },
                {
                    test: /\.svg$/,
                            oneOf: [{
                                issuer: /\.[jt]sx?$/,
                                resourceQuery: /react/, // *.svg?react
                                use: [{
                                loader: '@svgr/webpack',
                                options: {
                                    icon: true
                                }
                                }]
                            },
                            {
                                type: 'asset',
                                parser: {
                                dataUrlCondition: {
                                    maxSize: 200
                                }
                                }
                            },
        ],                },                
                {
                    test: /\.(png|woff2?|ttf|eot)$/,
                    type: "asset",
                    parser: {
                        dataUrlCondition: {
                            maxSize: 100000
                        }
                    }
                },
                { test: /\.(jpg|ico|gif)$/, type: "asset/resource" },
                { test: /\.htm$/, type: "asset/source" }
            ]
        },
        plugins: [
            new CleanWebpackPlugin({}),
            // new webpack.DefinePlugin({SENTRY_RELEASE: JSON.stringify(env.sentryRelease), "process.env": "{}"}),
            new webpack.ProvidePlugin({
                Buffer: [
                    'buffer',
                    'Buffer'
                ]
            }),
            new MiniCssExtractPlugin({
                // Options similar to the same options in webpackOptions.output
                // both options are optional
                filename: "[name].css",
                chunkFilename: "[id].css"
            }),
            new HtmlWebpackPlugin({
                title: 'Plan and forecast bicycle ride',
                filename: path.resolve(VIEWS_DIR, 'index.ejs'),
                template: path.resolve(TEMPLATE_DIR, 'base_index.html'),
                inject: false,
                minify: { minifyURLs: true, removeComments: true },
                chunks: ['main'],
                sentryRelease: env.sentryRelease,
                mode: mode,
                hash: true,
                favicon:'src/static/favicon.ico'
            }),
            new HtmlWebpackPlugin({
                title: 'Visualize randoplan usage on a world map',
                filename: path.resolve(VIEWS_DIR, 'vis_index.ejs'),
                template: path.resolve(TEMPLATE_DIR, 'visualize.html'),
                inject: false,
                hash: true,
                minify: { minifyURLs: true, removeComments: true },
                chunks: ['visualize'],
                mode: mode
            }),
             // Inject version from package.json
            new webpack.DefinePlugin({
                'process.env.SW_VERSION': JSON.stringify(process.env.npm_package_version)
            }),            
            new InjectManifest({
                swSrc: path.resolve(__dirname, 'src/pwa/worker.js'),
                swDest: 'worker.js',
                exclude: [/\.map$/,/\.ejs$/,/source-context\.json$/, /LICENSE\.txt$/, /visualize\./, /manifest\.json$/],
                maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10 MB
            }),
            new CopyWebpackPlugin({
                patterns: [
                    { from: SRC_STATIC_DIR + '/favicon*.*', to: path.resolve(STATIC_DIR, "[name][ext]") },
                    { from: SRC_STATIC_DIR + '/apple-*.*', to: path.resolve(STATIC_DIR, "[name][ext]") },
                    { from: 'manifest.json', to: path.resolve(STATIC_DIR, "[name][ext]") },
                    { from: 'robots.txt', to: path.resolve(STATIC_DIR, "[name][ext]") },
                    { from: 'node_modules/localforage/dist/localforage.min.js', to: path.resolve(STATIC_DIR, "lib/localforage.min.js") },
                    { from: 'node_modules/localforage/dist/localforage.js', to: path.resolve(STATIC_DIR, "lib/localforage.js") },
                    { from: 'source-context.json', to: path.resolve(SERVER_DIR, "[name][ext]") }
                ]
            })
        ],
        output:
        {
            path: STATIC_DIR,
            // pathinfo:'verbose',
            filename: "[name].bundle.[contenthash].js",
            chunkFilename: '[name].bundle.[contenthash].js'
            // sourceMapFilename: "[name].bundle.js.map",
            // publicPath: "static/"
        },
        resolve: {
            extensions: [
                '*',
                '.ts',
                '.tsx',
                '.js',
                '.jsx',
                '.d.ts'
            ],
            extensionAlias: {
                ".js": [".js", ".ts"],
                ".cjs": [".cjs", ".cts"],
                ".mjs": [".mjs", ".mts"]
            },
            modules:
                ["node_modules"],
            alias:
            {
                Images: SRC_STATIC_DIR
            },
        },
        // webpack.common.js
        optimization: {
            runtimeChunk: 'single',
            // moduleIds: 'named', //'deterministic',
            // chunkIds: 'named',
            splitChunks: {
                chunks: 'all',
                maxInitialRequests: 50,
                minSize: 3000,
                maxSize: 200000,
/*                 cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name(module) {
                            // get the name. E.g. node_modules/packageName/not/this/part.js
                            // or node_modules/packageName
                            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];

                            // npm package names are URL-safe, but some servers don't like @ symbols
                            return `npm.${packageName.replace('@', '')}`;
                        },
                    },
                }
 */            }
        }
    }
};
