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

      this.delegateCaps = {
        [CoreCapabilities.SIMPLEREST_URL]: `${baseUrl}{{#context.sessionId}};jsessionid={{context.sessionId}}{{/context.sessionId}}`,
        [CoreCapabilities.SIMPLEREST_METHOD]: 'POST',
        [CoreCapabilities.SIMPLEREST_COOKIE_REPLICATION]: true,
        [CoreCapabilities.SIMPLEREST_HEADERS_TEMPLATE]: `{
          "X-Botium": "true"
          {{#context.sessionId}}, "Cookie": "JSESSIONID={{context.sessionId}}"{{/context.sessionId}}
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
          requestOptions.form = { ...(requestOptions.form || {}), ...staticParams }
        },
        [CoreCapabilities.SIMPLEREST_CONTEXT_JSONPATH]: '$',
        [CoreCapabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.output.text'],
        [CoreCapabilities.SIMPLEREST_BUTTONS_JSONPATH]: '$.output.parameters.teneowebclient.button_items[*]',
        [CoreCapabilities.SIMPLEREST_BUTTONS_TEXT_SUBJSONPATH]: '$.title',
        [CoreCapabilities.SIMPLEREST_BUTTONS_PAYLOAD_SUBJSONPATH]: '$.postback',
        [CoreCapabilities.SIMPLEREST_PARSER_HOOK]: ({ body, changeBody }) => {
          if (body && body.output && body.output.parameters) {
            for (const key of Object.keys(body.output.parameters)) {
              try {
                body.output.parameters[key] = JSON.parse(body.output.parameters[key])
              } catch (err) {}
            }
          }
          debug(`Parsed Response Body: ${JSON.stringify(body, null, 2)}`)
          changeBody(body)
        },
        [CoreCapabilities.SIMPLEREST_STOP_URL]: `${baseUrl}endsession{{#context.sessionId}};jsessionid={{context.sessionId}}{{/context.sessionId}}`,
        [CoreCapabilities.SIMPLEREST_STOP_VERB]: 'GET',
        [CoreCapabilities.SIMPLEREST_STOP_HEADERS]: `{
          "X-Botium": "true"
          {{#context.sessionId}}, "Cookie": "JSESSIONID={{context.sessionId}}"{{/context.sessionId}}
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
