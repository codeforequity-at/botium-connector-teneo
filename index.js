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
      }
    ]
  }
}
