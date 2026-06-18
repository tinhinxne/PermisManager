const rules = require('./webpack.rules');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// ✅ CSS
rules.push({
  test: /\.css$/,
  use: ['style-loader', 'css-loader'],
});

// ✅ Images
rules.push({
  test: /\.(png|jpg|jpeg|gif|svg)$/,
  type: 'asset/resource',
});

// ✅ 🔥 JSX (TRÈS IMPORTANT)
rules.push({
  test: /\.(js|jsx)$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
  },
});

module.exports = {
  entry: './src/renderer/index.jsx',

  module: {
    rules,
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
};