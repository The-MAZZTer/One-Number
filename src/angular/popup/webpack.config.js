const path = require('path');

module.exports = {
	module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: "ifdef-loader",
          options: {
            ANGULAR: true
          }
        }],
        exclude: /node_modules/
      }
    ]
  }
}