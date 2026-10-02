const path = require("node:path");

module.exports = {
  mode: "production",
  target: ["web", "es2020"],
  context: path.resolve(__dirname, ".."),
  cache: false,
  entry: "./cms/editor.js",
  output: {
    path: path.resolve(__dirname, "../.cms-build"),
    filename: "decap-cms.js",
    chunkFilename: "[contenthash].cms.js",
    assetModuleFilename: "[contenthash][ext]",
    publicPath: "/admin/",
    clean: true,
  },
  resolve: { mainFields: ["browser", "module", "main"] },
  module: {
    rules: [
      { test: /\.m?js$/, resolve: { fullySpecified: false } },
      { test: /\.(woff2?|ttf|eot|wasm)$/, type: "asset/resource" },
    ],
  },
  // Retain private source maps for module verification, never publish them.
  devtool: "hidden-source-map",
  optimization: { moduleIds: "deterministic", chunkIds: "deterministic" },
  performance: { hints: false },
};
