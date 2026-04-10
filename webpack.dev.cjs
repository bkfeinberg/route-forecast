const { mergeWithCustomize, customizeObject } = require('webpack-merge');
const clientCommon = require('./webpack.common.cjs');

// eslint-disable-next-line no-undef
module.exports = (env, argv) => mergeWithCustomize(
    {
        customizeObject: customizeObject({
            entry: 'prepend'
        })
    })(clientCommon(env,argv), {
        devtool: 'eval-source-map',
        optimization: {
            emitOnErrors: false
        }
    }
);
