const BotiumConnectorTeneo = require('./src/connector')

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorTeneo,
  PluginDesc: {
    name: 'Botium Connector for Teneo',
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
