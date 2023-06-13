import { Data } from 'complex-utils'
import Instance from './Instance'
import Token, { TokenInitOption } from './Token'
import { errorType } from './Require'

export type tokenType = {
  append?: boolean
  time?: number
  session?: boolean
  data?: Record<string, TokenInitOption>
}

export interface appendTokenStatus {
  status: string
  code?: string
  msg?: string
}

export interface responseType<D = any> {
  status: 'success' | 'fail' | 'login'
  data: D
  msg?: string
  code?: number | string
}

type checkUrlType = (url: string) => boolean
type formatType = (response: any, instance: Instance) => responseType
type formatUrlType = (url: string) => string
type refreshLoginType = () => Promise<unknown>
type refreshTokenType = (tokenName: string) => Promise<unknown>
type failType = (errRes: errorType) => string

export interface RuleInitOption {
  prop: string
  name: string
  token?: tokenType
  checkUrl: checkUrlType
  format: formatType
  formatUrl?: formatUrlType
  refreshLogin?: refreshLoginType
  refreshToken?: refreshTokenType
  fail?: failType
}

export type formatTokenType = {
  append: boolean
  data: Record<string, Token>
}

function defaultFormatUrl(url: string) {
  return url
}

function defaultFail() {
  return ''
}

class Rule extends Data {
  static $name = 'Rule'
  prop: string
  name: string
  token: formatTokenType
  checkUrl: checkUrlType
  format: formatType
  formatUrl: formatUrlType
  refreshLogin?: refreshLoginType
  refreshToken?: refreshTokenType
  fail: failType
  constructor(initOption: RuleInitOption) {
    super()
    this.prop = initOption.prop
    this.name = initOption.name
    const token = initOption.token || {}
    const tokenData: Record<string, Token> = {}
    if (token && token.data) {
      for (const tokenName in token.data) {
        tokenData[tokenName] = new Token(token.data[tokenName], tokenName, this.prop, token.time, token.session)
      }
    }
    this.token = {
      append: token.append === undefined ? true : token.append,
      data: tokenData
    }
    this.checkUrl = initOption.checkUrl
    this.format = initOption.format
    this.formatUrl = initOption.formatUrl || defaultFormatUrl
    this.fail = initOption.fail || defaultFail
  }
  getTokenList() {
    return Object.keys(this.token.data)
  }
  formatRequireInstance(instance: Instance): Promise<appendTokenStatus> {
    return new Promise((resolve, reject) => {
      if (this.token.append) {
        const tokenList = instance.data.token as string[]
        if (tokenList && tokenList.length > 0) {
          this.appendToken(tokenList, 0, instance).then(res => {
            resolve(res)
          }).catch(err => {
            reject(err)
          })
        } else {
          resolve({ status: 'success', code: 'empty token list' })
        }
      } else {
        resolve({ status: 'success', code: 'no append' })
      }
    })
  }
  appendToken(tokenList: string[], index: number, instance: Instance): Promise<appendTokenStatus> {
    return new Promise((resolve, reject) => {
      this.$appendToken(instance, tokenList[index]).then(() => {
        index = index + 1
        if (index >= tokenList!.length) {
          resolve({ status: 'success' })
        } else {
          this.appendToken(tokenList, index, instance).then(res => {
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
  getToken (tokenName: string): undefined | Token {
    return this.token.data[tokenName]
  }
  $appendToken(instance: Instance, tokenName: string, isRefresh?: boolean): Promise<appendTokenStatus> {
    const tokenItem = this.getToken(tokenName)
    if (tokenItem) {
      const tokenData = tokenItem.getData()
      const next = tokenItem.hasData(tokenData)
      if (next === 'exist') {
        instance.appendData(tokenItem.location, tokenName, tokenData)
        return Promise.resolve({ status: 'success' })
      } else if (next === 'empty') {
        return this.$refreshToken(instance, tokenName, isRefresh)
      } else {
        return Promise.resolve({ status: 'success' })
      }
    } else {
      return Promise.reject({ status: 'fail', code: 'undefined rule token', msg: `未找到${tokenName}对应的Token` })
    }
  }
  $refreshToken(instance: Instance, tokenName: string, isRefresh?: boolean): Promise<appendTokenStatus> {
    if (this.refreshToken && !isRefresh) {
      return new Promise((resolve, reject) => {
        this.refreshToken!(tokenName).then(() => {
          this.$appendToken(instance, tokenName, true).then(res => {
            resolve(res)
          }).catch(err => {
            reject(err)
          })
        }).catch(err => {
          reject(err)
        })
      })
    } else {
      return Promise.reject({ status: 'fail', code: 'empty token', msg: `Token:${tokenName}的值不存在` })
    }
  }
}

export default Rule
