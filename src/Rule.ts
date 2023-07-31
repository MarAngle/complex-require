import { DefaultData, LifeData } from 'complex-data-next'
import { DefaultDataInitOption } from 'complex-data-next/src/data/DefaultData'
import Require, { errorType } from './Require'
import Instance from './Instance'
import Token, { TokenInitOption } from './Token'
import { upperCaseFirstChar } from 'complex-utils'

export type tokenType = {
  time?: number
  session?: boolean
  data?: Record<string, TokenInitOption>
}

export interface appendTokenStatus {
  status: string
  code?: string
  msg?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface responseType<D = any> {
  status: 'success' | 'fail' | 'login'
  data: D
  msg?: string
  code?: number | string
}

type checkUrlType = (url: string) => boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type formatType = (response: any, instance: Instance) => responseType
type formatUrlType = (url: string) => string
type refreshLoginType = () => Promise<unknown>
type refreshTokenType = (tokenName: string) => Promise<unknown>
type failType = (errRes: errorType) => string

export interface RuleInitOption extends DefaultDataInitOption<Require> {
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

export type formatTokenType = Record<string, Token>

function defaultFormatUrl(url: string) {
  return url
}

function defaultFail() {
  return ''
}
/**
 * 已定义以下事件
 * create相关事件
 * login:需要登录
 * token:需要token
 * beforeRefreshToken:准备刷新token
 * refreshTokened:刷新token完成
 * refreshTokenFail:刷新token失败
 * beforeRefreshLogin:准备刷新login
 * refreshLogined:刷新login完成
 * refreshLoginFail:刷新login失败
 */
class Rule extends DefaultData<Require> {
  static $name = 'Rule'
  token: formatTokenType
  checkUrl: checkUrlType
  format: formatType
  formatUrl: formatUrlType
  refreshLogin?: refreshLoginType
  refreshToken?: refreshTokenType
  fail: failType
  constructor(initOption: RuleInitOption) {
    super(initOption)
    this.$triggerCreateLife('Rule', 'beforeCreate', initOption)
    const token = initOption.token || {}
    const tokenData: Record<string, Token> = {}
    if (token && token.data) {
      for (const tokenName in token.data) {
        tokenData[tokenName] = new Token(token.data[tokenName], tokenName, this.$prop, token.time, token.session)
      }
    }
    this.token = tokenData
    this.checkUrl = initOption.checkUrl
    this.format = initOption.format
    this.formatUrl = initOption.formatUrl || defaultFormatUrl
    this.refreshLogin = initOption.refreshLogin
    this.refreshToken = initOption.refreshToken
    this.fail = initOption.fail || defaultFail
    this.$triggerCreateLife('Rule', 'beforeCreate', initOption)
  }
  getTokenList() {
    return Object.keys(this.token)
  }
  formatRequireInstance(instance: Instance): Promise<appendTokenStatus> {
    return new Promise((resolve, reject) => {
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
  getTokenData (tokenName: string): undefined | Token {
    return this.token[tokenName]
  }
  $appendToken(instance: Instance, tokenName: string, isRefresh?: boolean): Promise<appendTokenStatus> {
    const tokenItem = this.getTokenData(tokenName)
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
        this.$triggerLife('beforeRefreshToken', this, tokenName, isRefresh)
        this.refreshToken!(tokenName).then(() => {
          this.$triggerLife('refreshTokened', this, tokenName, isRefresh)
          this.$appendToken(instance, tokenName, true).then(res => {
            resolve(res)
          }).catch(err => {
            reject(err)
          })
        }).catch(err => {
          this.$triggerLife('refreshTokenFail', this, tokenName, isRefresh)
          reject(err)
        })
      })
    } else {
      this.$triggerLife('token', this, tokenName, isRefresh)
      return Promise.reject({ status: 'fail', code: 'empty token', msg: `Token:${tokenName}的值不存在` })
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setToken(tokenName: string, data: any, noSave?: boolean) {
    if (this.token[tokenName]) {
      this.token[tokenName].setData(data, noSave)
    } else {
      this.$exportMsg(`未找到${tokenName}对应的token规则,setToken失败！`, 'error')
    }
  }
  getToken (tokenName: string) {
    if (this.token[tokenName]) {
      return this.token[tokenName].getData()
    } else {
      this.$exportMsg(`未找到${tokenName}对应的token规则,getToken失败！`, 'error')
    }
  }
  clearToken(tokenName: true | string) {
    if (tokenName) {
      if (tokenName === true) {
        for (const n in this.token) {
          this.$clearToken(n)
        }
        return true
      } else {
        return this.$clearToken(tokenName)
      }
    } else {
      this.$exportMsg(`未指定需要清除的token！`)
      return false
    }
  }
  $clearToken (tokenName: string) {
    if (this.token[tokenName]) {
      this.token[tokenName].clearData()
      return true
    } else {
      this.$exportMsg(`未找到${tokenName}对应的token规则,clearToken失败！`, 'warn')
      return false
    }
  }
  destroyToken (tokenName: true | string) {
    if (tokenName) {
      if (tokenName === true) {
        for (const n in this.token) {
          this.$destroyToken(n)
        }
        return true
      } else {
        return this.$destroyToken(tokenName)
      }
    } else {
      this.$exportMsg(`未指定需要销毁的token！`)
      return false
    }
  }
  $destroyToken (tokenName: string) {
    if (this.token[tokenName]) {
      this.token[tokenName].destroyData()
      delete this.token[tokenName]
      return true
    } else {
      this.$exportMsg(`未找到${tokenName}对应的token规则,destroyToken失败！`, 'warn')
      return false
    }
  }
  $triggerLife(...args: Parameters<LifeData['trigger']>) {
    const parentArgs = [...args] as Parameters<LifeData['trigger']>
    parentArgs[0] = 'rule' + upperCaseFirstChar(args[0])
    this.$parent!.$triggerLife(...parentArgs)
    super.$triggerLife(...args)
  }
  $selfName() {
    return `RequireRule:${this.$name}/${this.$prop}`
  }
}

export default Rule
