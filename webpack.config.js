var path = require('path');
var webpack = require('webpack');
var pkg = require('./package.json');
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');

var PATHS = {
    dist: path.join(__dirname, 'dist/')
  };

module.exports = {
    entry: './app.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            { test: /\.css$/, use: ['style-loader', 'css-loader' ] },
            { test: /\.png$/, loader: 'url-loader?limit=8192', query: { mimetype: 'image/png' } },
            { test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/, loader: 'url-loader' },
            { test: /\.js?$/, exclude: /node_modules/, use: {
                loader: "babel-loader",
            } },
            { test: /\.html$/, loader: 'raw-loader' }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            '$': 'jquery',
            'Util': "exports-loader?Util!bootstrap/js/dist/util"
        }),
        new webpack.DefinePlugin( {'VERSION': JSON.stringify(pkg.version) }),
        new UglifyJSPlugin(),
        //new BundleAnalyzerPlugin()
    ],
    devServer: {
        open: true,
        contentBase: PATHS.dist,
        watchContentBase: true,
        port: 8008
    }
};
