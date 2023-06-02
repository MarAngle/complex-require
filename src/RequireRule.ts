import { appendProp, Data } from 'complex-utils'
import { IsFormatRequireOption } from './Require'
import TokenRule, { initOptionType as TokenRuleInitOptionType } from './TokenRule'

type tokenType = {
  check?: boolean
  time?: number
  session?: boolean
  data?: {
    [prop: string]: TokenRuleInitOptionType
  }
}

type tokenDataType = {
  [prop: string]: TokenRule
}

type formatTokenType = {
  check: boolean
  data: tokenDataType
}

export interface responseType<D = any> {
  status: 'success' | 'fail' | 'login'
  data: D
  msg?: string
  code?: number | string
}

type checkUrlType = (url: string) => boolean
type formatUrlType = (url: string) => string
type formatResponseType = (response: any, optionData?: any) => responseType
type refreshLoginType = () => Promise<unknown>
type refreshTokenType = (tokenName: string, isRefresh?: boolean, isRefreshLogin?: boolean) => Promise<unknown>
type requireFailType = (errRes: any) => string

export type initOptionType = {
  name: string
  prop: string
  token?: tokenType
  checkUrl: checkUrlType
  formatResponse: formatResponseType
  formatUrl?: formatUrlType
  refreshLogin?: refreshLoginType
  refreshToken?: refreshTokenType
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
  refreshLogin?: refreshLoginType
  refreshToken?: refreshTokenType
  requireFail?: requireFailType
  constructor({
    name,
    prop,
    token = {},
    checkUrl,
    formatResponse,
    formatUrl,
    refreshLogin,
    refreshToken,
    requireFail
  }: initOptionType) {
    super()
    this.name = name
    this.prop = prop
    const tokenData: tokenDataType = {}
    if (token.data) {
      for (const n in token.data) {
        tokenData[n] = new TokenRule(n, token.data[n], token.time, token.session)
      }
    }
    this.token = {
      check: token.check === undefined ? true : token.check,
      data: tokenData
    }
    this.checkUrl = checkUrl
    this.formatResponse = formatResponse
    this.formatUrl = formatUrl
    this.refreshLogin = refreshLogin
    this.refreshToken = refreshToken
    this.requireFail = requireFail
  }
  formatRequire(optionData: IsFormatRequireOption, isRefreshLogin?: boolean) {
    if (!isRefreshLogin) {
      if (this.formatUrl) {
        optionData.url = this.formatUrl(optionData.url)
      }
    }
    return this.appendToken(optionData, isRefreshLogin)
  }
  appendToken (optionData: IsFormatRequireOption, isRefreshLogin?: boolean): Promise<{ status: string, code: string, data: RequireRule }> {
    return new Promise((resolve, reject) => {
      if (this.token.check) {
        const tokenList = (optionData.token === undefined || optionData.token === true) ? Object.keys(this.token.data) : optionData.token
        if (tokenList && tokenList.length > 0) {
          this.appendTokenByList(tokenList, 0, optionData, isRefreshLogin).then(res => {
            resolve(res)
          }).catch(err => {
            reject(err)
          })
        } else {
          resolve({ status: 'success', code: 'tokenList empty', data: this })
        }
      } else {
        resolve({ status: 'success', code: 'no check', data: this })
      }
    })
  }
  appendTokenByList(tokenList: string[], index: number, optionData: IsFormatRequireOption, isRefreshLogin?: boolean): Promise<{ status: string, code: string, data: RequireRule }> {
    return new Promise((resolve, reject) => {
      this.$appendToken(optionData, tokenList[index], false, isRefreshLogin).then(() => {
        index = index + 1
        if (index >= tokenList!.length) {
          resolve({ status: 'success', code: 'success', data: this })
        } else {
          this.appendTokenByList(tokenList, index, optionData, isRefreshLogin).then(res => {
            resolve(res)
          }).catch(err => {
            reject(err)
          })
        }
      }).catch(err => {
        reject(err)
      })
    })
  }
  getTokenRule (prop: string): undefined | TokenRule {
    return this.token.data[prop]
  }
  $appendToken(optionData: IsFormatRequireOption, prop: string, isRefresh?: boolean, isRefreshLogin?: boolean) {
    const tokenRuleItem = this.getTokenRule(prop)
    if (tokenRuleItem) {
      const tokenData = tokenRuleItem.getData(this.prop)
      const next = tokenRuleItem.checkData(tokenData)
      if (next == 'success') {
        if (tokenRuleItem.location == 'body') {
          appendProp(optionData.data, prop, tokenData, optionData.$currentDataType)
        } else if (tokenRuleItem.location == 'header') {
          optionData.headers[prop] = tokenData
        } else if (tokenRuleItem.location == 'params') {
          optionData.params[prop] = tokenData
        }
        return Promise.resolve({ status: 'success' })
      } else if (next == 'fail') {
        return this.$refreshToken(optionData, prop, isRefresh, isRefreshLogin)
      } else {
        return Promise.resolve({ status: 'success' })
      }
    } else {
      return Promise.reject({ status: 'fail', code: 'undefined rule prop', msg: `未找到${prop}对应的token规则` })
    }
  }
  $refreshToken(optionData: IsFormatRequireOption, prop: string, isRefresh?: boolean, isRefreshLogin?: boolean) {
    if (this.refreshToken) {
      return new Promise((resolve, reject) => {
        this.refreshToken!(prop, isRefresh, isRefreshLogin).then(() => {
          this.$appendToken(optionData, prop, true, isRefreshLogin).then(res => {
            resolve(res)
          }).catch(err => {
            reject(err)
          })
        }).catch(err => {
          reject(err)
        })
      })
    } else {
      return Promise.reject({ status: 'fail', code: 'undefined token', msg: `TOKEN:${prop}的值不存在` })
    }
  }
  setToken (tokenName: string, data: any, noSave?: boolean) {
    if (this.token.data[tokenName]) {
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
