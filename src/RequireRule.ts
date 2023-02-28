import { appendProp, Data } from 'complex-utils'
import config from '../config'
import { IsFormatRequireOption } from './Require'
import TokenRule, { initOptionType as TokenRuleInitOptionType } from './TokenRule'

type tokenType = {
  check?: boolean,
  fail?: (tokenName: string, target: RequireRule) => any,
  data?: {
    [prop: string]: TokenRuleInitOptionType
  }
}

type tokenDataType = {
  [prop: string]: TokenRule
}

type formatTokenType = {
  check: boolean,
  fail: false | ((tokenName: string, target: RequireRule) => any),
  data: tokenDataType
}

export interface responseType {
  status: 'success' | 'fail' | 'login',
  data?: any,
  msg?: string,
  code?: number | string
}

type checkUrlType = (url: string) => boolean
type formatUrlType = (url: string) => string
type formatResponseType = (response: any, optionData?: any) => responseType
type requireFailType = (errRes: any) => any

export type initOptionType = {
  name: string,
  prop: string,
  token?: tokenType,
  checkUrl: checkUrlType,
  formatResponse: formatResponseType,
  formatUrl?: formatUrlType,
  requireFail?: requireFailType
}

class RequireRule extends Data {
  static $name = 'RequireRule'
  name: string
  prop: string
  token: formatTokenType
  checkUrl: checkUrlType
  formatUrl?: formatUrlType
  formatResponse: formatResponseType
  requireFail?: requireFailType
  // failMsg: undefined | ((errRes: any) => any)
  constructor({
    name,
    prop,
    token = {},
    checkUrl,
    formatResponse,
    formatUrl,
    requireFail
  }: initOptionType) {
    super()
    this.name = name
    this.prop = prop
    const tokenData: tokenDataType = {}
    if (token.data) {
      for (const n in token.data) {
        tokenData[n] = new TokenRule(n, token.data[n])
      }
    }
    this.token = {
      check: token.check === undefined ? true : token.check,
      fail: token.fail || false,
      data: tokenData
    }
    this.checkUrl = checkUrl
    this.formatResponse = formatResponse
    this.formatUrl = formatUrl
    this.requireFail = requireFail
  }
  formatRequire(optionData: IsFormatRequireOption) {
    if (this.formatUrl) {
      optionData.url = this.formatUrl(optionData.url)
    }
    return this.appendToken(optionData)
  }
  appendToken (optionData: IsFormatRequireOption) {
    if (this.token.check) {
      if (optionData.token === undefined || optionData.token == config.RequireRule.defaultTokenName) {
        for (const n in this.token.data) {
          const check = this.$appendToken(optionData, n)
          if (!check.next) {
            return check
          }
        }
      } else if (optionData.token) {
        if (typeof optionData.token == 'string') {
          const check = this.$appendToken(optionData, optionData.token)
          if (!check.next) {
            return check
          }
        } else {
          for (const n in optionData.token) {
            const check = this.$appendToken(optionData, optionData.token[n])
            if (!check.next) {
              return check
            }
          }
        }
      }
    }
  }
  getTokenRule (prop: string): undefined | TokenRule {
    return this.token.data[prop]
  }
  $appendToken(optionData: IsFormatRequireOption, prop: string) {
    const check = {
      prop: prop,
      next: true,
      code: '',
      msg: ''
    }
    const tokenRuleItem = this.getTokenRule(prop)
    if (tokenRuleItem) {
      const tokenData = tokenRuleItem.getData(this.prop)
      const next = tokenRuleItem.checkData(tokenData)
      if (next == 'success') {
        if (tokenRuleItem.location == 'body') {
          appendProp(optionData.data, prop, tokenData, optionData.localType)
        } else if (tokenRuleItem.location == 'header') {
          optionData.headers[prop] = tokenData
        } else if (tokenRuleItem.location == 'params') {
          optionData.params[prop] = tokenData
        }
      } else if (next == 'fail') {
        check.next = false
        check.code = 'undefined token'
        check.msg = `TOKEN:${prop}的值不存在`
      }
    } else {
      check.next = false
      check.code = 'undefined rule prop'
      check.msg = `未找到${prop}对应的token规则`
    }
    return check
  }
  setToken (tokenName: string, data: any, noSave?: boolean) {
    if (!this.token.data[tokenName]) {
      this.token.data[tokenName].setData(this.prop, data, noSave)
    } else {
      this.$exportMsg(`未找到${tokenName}对应的token规则,setToken失败！`, 'error')
    }
  }
  getToken (tokenName: string) {
    if (this.token.data[tokenName]) {
      return this.token.data[tokenName].getData(this.prop)
    } else {
      this.$exportMsg(`未找到${tokenName}对应的token规则,getToken失败！`, 'error')
    }
  }
  clearToken(tokenName: true | string) {
    if (tokenName) {
      if (tokenName === true) {
        for (const n in this.token.data) {
          this.$clearToken(n)
        }
      } else {
        this.$clearToken(tokenName)
      }
      return true
    } else {
      this.$exportMsg(`未指定需要清除的token！`)
      return false
    }
  }
  $clearToken (tokenName: string) {
    if (this.token.data[tokenName]) {
      this.token.data[tokenName].clearData(this.prop)
    }
  }
  destroyToken (tokenName: true | string) {
    if (tokenName) {
      if (tokenName === true) {
        for (const n in this.token.data) {
          this.$destroyToken(n)
        }
      } else {
        this.$destroyToken(tokenName)
      }
      return true
    } else {
      this.$exportMsg(`未指定需要删除的token！`)
      return false
    }
  }
  $destroyToken (tokenName: string) {
    if (this.token.data[tokenName]) {
      this.token.data[tokenName].destroyData(this.prop)
      delete this.token.data[tokenName]
    }
  }
  $tokenFail (tokenName: string) {
    if (this.token.fail) {
      this.token.fail(tokenName, this)
    }
  }
  $requireFail (errRes: any) {
    if (this.requireFail) {
      return this.requireFail(errRes)
    } else {
      return ''
    }
  }
  $selfName() {
    return `(${super.$selfName()}:[${this.name}/${this.prop}])`
  }
}


export default RequireRule
