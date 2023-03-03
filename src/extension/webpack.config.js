const path = require('path');

module.exports = {
  mode: "development", // "production" | "development" | "none"
  entry: "./program.ts", // string | object | array
  output: {
    path:path.resolve(__dirname, "../../bin"), // string (default)
    filename: "program.js", // string (default)
  },
	module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: "ts-loader"
        }, {
          loader: "ifdef-loader",
          options: {
            ANGULAR: false
          }
        }],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
	devtool: 'source-map'
}