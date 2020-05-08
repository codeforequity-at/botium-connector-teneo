const fs = require('fs')
const path = require('path')
const BotiumConnectorTeneo = require('./src/connector')

const logo = fs.readFileSync(path.join(__dirname, 'logo.png')).toString('base64')

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorTeneo,
  PluginDesc: {
    name: 'Botium Connector for Teneo',
    avatar: logo,
    provider: 'Teneo',
    capabilities: [
      {
        name: 'TENEO_URL',
        label: 'Teneo URL',
        description: 'Teneo chatbot endpoint url',
        type: 'url',
        required: true
      },
      {
        name: 'TENEO_STATIC_PARAMS',
        label: 'Additional Static Parameters',
        description: 'Static parameters to add as endpoint url query parameters',
        type: 'dictionary',
        required: false
      }
    ]
  }
}
