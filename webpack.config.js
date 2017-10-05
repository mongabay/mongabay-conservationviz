const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: './index.js',

  // webpack dev-server configuration
  devServer: {
    compress: true, // use compression
    port: 8889, // what port on localhost content will be served from
    // hotOnly: true, // for hot-module-replacement
    contentBase: './dist'
  },

  plugins: [
    new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({
      template: "./index.html"
    })
  ],

  // what type of source maps to use
  devtool: 'inline-source-map',

  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }, 
  module: {
    rules: [

      // Lint JS and transpile ES6 to ES5
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
          // {
          //   loader: 'eslint-loader',
          // },
        ],
      },

      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        loader: 'url-loader',
        options: {
          limit: 8192,
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          'file-loader'
        ]
      }

    ]
  }



};


