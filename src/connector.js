const util = require('util')
const debug = require('debug')('botium-connector-teneo')

const SimpleRestContainer = require('botium-core/src/containers/plugins/SimpleRestContainer')
const CoreCapabilities = require('botium-core/src/Capabilities')

const Capabilities = {
  TENEO_URL: 'TENEO_URL'
}

const Defaults = {
}

class BotiumConnectorTeneo {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.delegateContainer = null
    this.delegateCaps = null
  }

  Validate () {
    debug('Validate called')

    this.caps = Object.assign({}, Defaults, this.caps)

    if (!this.caps[Capabilities.TENEO_URL]) throw new Error('TENEO_URL capability required')
    if (!this.delegateContainer) {
      let baseUrl = this.caps[Capabilities.TENEO_URL]
      if (!baseUrl.endsWith('/')) {
        baseUrl = baseUrl + '/'
      }

      this.delegateCaps = {
        [CoreCapabilities.SIMPLEREST_URL]: `${baseUrl}?viewtype=tieapi&userinput={{msg.messageText}}`,
        [CoreCapabilities.SIMPLEREST_METHOD]: 'GET',
        [CoreCapabilities.SIMPLEREST_HEADERS_TEMPLATE]: {
          Cookie: 'JSESSIONID={{context.sessionId}}'
        },
        [CoreCapabilities.SIMPLEREST_REQUEST_HOOK]: ({ requestOptions, msg, context }) => {
          if (msg.TENEO_PARAM && Object.keys(msg.TENEO_PARAM).length > 0) {
            const appendToUri = Object.keys(msg.TENEO_PARAM).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(msg.TENEO_PARAM[key])}`).join('&')
            if (requestOptions.uri.indexOf('?') > 0) {
              requestOptions.uri = `${requestOptions.uri}&${appendToUri}`
            } else {
              requestOptions.uri = `${requestOptions.uri}?${appendToUri}`
            }
          }
        },
        [CoreCapabilities.SIMPLEREST_CONTEXT_JSONPATH]: '$',
        [CoreCapabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.output.text'],
        [CoreCapabilities.SIMPLEREST_RESPONSE_HOOK]: ({ botMsg }) => {
          if (botMsg.sourceData.output && botMsg.sourceData.output.parameters) {
            for (const key of Object.keys(botMsg.sourceData.output.parameters)) {
              try {
                botMsg.sourceData.output.parameters[key] = JSON.parse(botMsg.sourceData.output.parameters[key])
              } catch (err) {
              }
            }
          }
          debug(`Response Body: ${JSON.stringify(botMsg.sourceData)}`)
        },
        [CoreCapabilities.SIMPLEREST_STOP_URL]: `${baseUrl}endsession`,
        [CoreCapabilities.SIMPLEREST_STOP_VERB]: 'GET',
        [CoreCapabilities.SIMPLEREST_STOP_HEADERS]: {
          Cookie: 'JSESSIONID={{context.sessionId}}'
        }
      }
      for (const capKey of Object.keys(this.caps).filter(c => c.startsWith('SIMPLEREST'))) {
        if (!this.delegateCaps[capKey]) this.delegateCaps[capKey] = this.caps[capKey]
      }

      debug(`Validate delegateCaps ${util.inspect(this.delegateCaps)}`)
      this.delegateContainer = new SimpleRestContainer({ queueBotSays: this.queueBotSays, caps: this.delegateCaps })
    }

    debug('Validate delegate')
    return this.delegateContainer.Validate()
  }

  Build () {
    return this.delegateContainer.Build()
  }

  Start () {
    return this.delegateContainer.Start()
  }

  UserSays (msg) {
    return this.delegateContainer.UserSays(msg)
  }

  Stop () {
    return this.delegateContainer.Stop()
  }

  Clean () {
    return this.delegateContainer.Clean()
  }
}

module.exports = BotiumConnectorTeneo
