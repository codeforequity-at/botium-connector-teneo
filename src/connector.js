const util = require('util')
const _ = require('lodash')
const debug = require('debug')('botium-connector-teneo')

const SimpleRestContainer = require('botium-core/src/containers/plugins/SimpleRestContainer')
const CoreCapabilities = require('botium-core/src/Capabilities')

const Capabilities = {
  TENEO_URL: 'TENEO_URL',
  TENEO_VERSION: 'TENEO_VERSION',
  TENEO_STATIC_PARAMS: 'TENEO_STATIC_PARAMS'
}

const Defaults = {
  TENEO_VERSION: 'V5'
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
    if (this.caps[Capabilities.TENEO_STATIC_PARAMS] && !_.isObject(this.caps[Capabilities.TENEO_STATIC_PARAMS])) {
      throw new Error('TENEO_STATIC_PARAMS capability required as dictionary')
    }

    if (!this.delegateContainer) {
      let baseUrl = this.caps[Capabilities.TENEO_URL]
      if (!baseUrl.endsWith('/')) {
        baseUrl = baseUrl + '/'
      }

      const isV5 = (this.caps[Capabilities.TENEO_VERSION] === 'V5')
      const isV7 = (this.caps[Capabilities.TENEO_VERSION] === 'V7')

      this.delegateCaps = {
        [CoreCapabilities.SIMPLEREST_URL]: isV7 ? `${baseUrl}{{#context.sessionId}};jsessionid={{context.sessionId}}{{/context.sessionId}}` : baseUrl,
        [CoreCapabilities.SIMPLEREST_METHOD]: isV5 ? 'GET' : 'POST',
        [CoreCapabilities.SIMPLEREST_COOKIE_REPLICATION]: true,
        [CoreCapabilities.SIMPLEREST_HEADERS_TEMPLATE]: `{
          "Cookie": "JSESSIONID={{context.sessionId}}",
          {{#response.headers.x-gateway-session}}"X-Teneo-Session": "JSESSIONID={{context.sessionId}}; {{response.headers.x-gateway-session}}"{{/response.headers.x-gateway-session}}
        }`,
        [CoreCapabilities.SIMPLEREST_REQUEST_HOOK]: ({ requestOptions, msg, context }) => {
          const staticParams = {
            viewtype: 'tieapi',
            userinput: msg.messageText
          }
          if (this.caps[Capabilities.TENEO_STATIC_PARAMS]) {
            for (const [key, value] of Object.entries(this.caps[Capabilities.TENEO_STATIC_PARAMS])) {
              staticParams[key] = `${value}`
            }
          }
          if (msg.TENEO_PARAM && _.isObject(msg.TENEO_PARAM)) {
            for (const [key, value] of Object.entries(msg.TENEO_PARAM)) {
              staticParams[key] = `${value}`
            }
          }
          if (isV5) {
            const appendToUri = Object.keys(staticParams).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(staticParams[key])}`).join('&')
            if (requestOptions.uri.indexOf('?') > 0) {
              requestOptions.uri = `${requestOptions.uri}&${appendToUri}`
            } else {
              requestOptions.uri = `${requestOptions.uri}?${appendToUri}`
            }
          } else {
            requestOptions.form = { ...(requestOptions.form || {}), ...staticParams }
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
        [CoreCapabilities.SIMPLEREST_STOP_URL]: isV7 ? `${baseUrl}endsession{{#context.sessionId}};jsessionid={{context.sessionId}}{{/context.sessionId}}` : `${baseUrl}endsession`,
        [CoreCapabilities.SIMPLEREST_STOP_VERB]: 'GET',
        [CoreCapabilities.SIMPLEREST_STOP_HEADERS]: `{
          "Cookie": "JSESSIONID={{context.sessionId}}",
          {{#response.headers.x-gateway-session}}"X-Teneo-Session": "JSESSIONID={{context.sessionId}}; {{response.headers.x-gateway-session}}"{{/response.headers.x-gateway-session}}
        }`
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
