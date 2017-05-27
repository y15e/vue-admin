const merge = require('webpack-merge')
const baseConfig = require('./webpack.base.config')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')

const config = merge(baseConfig, {
  entry: './src/entry-client.js',
  resolve: {
    alias: {
      'api': './api/api-client.js'
    }
  },
  plugins: [
    new VueSSRClientPlugin() 
  ]
})

module.exports = config
