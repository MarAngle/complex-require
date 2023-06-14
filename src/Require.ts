import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { Data, getType, getEnv  } from 'complex-utils'
import Rule, { RuleInitOption } from './Rule'
import Instance, { InstanceInitOption, customParameters } from './Instance'
import config from '../config'

type statusType = {
  [prop: number]: string
}

export interface defaultRequireOptionType extends customParameters {
  method?: InstanceInitOption['method']
}

export type requireOptionType = InstanceInitOption

export type errorType = {
  status: 'fail'
  code: string
  msg: string
  instance: Instance
  error: any
}

export type formatUrlType = (url: string) => string

export type RequireInitOption = {
  baseUrl?: string
  option?: AxiosRequestConfig
  status?: statusType
  formatUrl?: formatUrlType
  rule: RuleInitOption[]
}

const defaultFormatUrlWithBaseUrl = function(this: Require, url: string) {
  if (url.indexOf('https://') != 0 && url.indexOf('http://') != 0) {
    // 当前URL不以http/https开始，则认为此URL需要添加默认前缀
    url = this.baseUrl + url
  }
  return url
}
const defaultFormatUrl = function(url: string) {
  return url
}

export type RequireMethod = 'get' | 'post' | 'delete' | 'put' | 'patch' | 'purge' | 'form' | 'json'

class Require extends Data {
  static $name = 'Require'
  service: AxiosInstance
  baseUrl: string
  status: statusType
  rule: Record<string, Rule>
  formatUrl: formatUrlType
  constructor(initOption: RequireInitOption) {
    super()
    this.service = axios.create(initOption.option)
    this.baseUrl = initOption.baseUrl || ''
    this.formatUrl = this.getFormatUrl(initOption.formatUrl)
    this.status = {
      ...config.require.status,
      ...initOption.status
    }
    this.rule = {}
    let defaultProp: undefined | string = undefined
    initOption.rule.forEach(ruleOption => {
      this.rule[ruleOption.prop] = new Rule(ruleOption)
      if (defaultProp === undefined) {
        defaultProp = ruleOption.prop
      }
    })
    if (defaultProp !== undefined) {
      if (!this.rule.default) {
        this.rule.default = this.rule[defaultProp]
      }
      if (getEnv('real') == 'development' && config.require.showRule) {
        this.$exportMsg(`默认的请求处理规则为[${this.rule.default!.$selfName()}]`, 'log')
      }
    } else {
      this.$exportMsg(`未获取到默认请求处理规则！`, 'error')
    }
  }
  getFormatUrl(formatUrl?: formatUrlType) {
    if (formatUrl) {
      return formatUrl
    } else if (this.baseUrl) {
      return defaultFormatUrlWithBaseUrl
    } else {
      return defaultFormatUrl
    }
  }
  changeFormatUrl() {
    // 当前格式化URL函数为默认函数时则进行重新获取操作
    if (this.formatUrl === defaultFormatUrlWithBaseUrl || this.formatUrl === defaultFormatUrl) {
      this.formatUrl = this.getFormatUrl()
    }
  }
  changeBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl || ''
    this.changeFormatUrl()
  }
  getRule(prop = 'default') {
    return this.rule[prop]
  }
  checkRule(url: string) {
    for (const prop in this.rule) {
      if (this.rule[prop].checkUrl(url)) {
        return this.rule[prop]
      }
    }
    return this.rule.default
  }
  ajax (requireOption: requireOptionType) {
    return new Promise((resolve, reject) => {
      this.service(requireOption).then(response => {
        resolve(response)
      }).catch(error => {
        reject(error)
      })
    })
  }
  $formatRequireOption(requireOption: requireOptionType, defaultRequireOption: defaultRequireOptionType = {}) {
    requireOption.url = this.formatUrl(requireOption.url)
    // 添加默认值
    if (!requireOption.method) {
      requireOption.method = defaultRequireOption.method || 'get'
    }
    if (!requireOption.headers) {
      requireOption.headers = {}
    }
    if (!requireOption.$dataType) {
      requireOption.$dataType = defaultRequireOption.$dataType || 'json'
    }
    if (!requireOption.$currentDataType) {
      requireOption.$currentDataType = defaultRequireOption.$currentDataType || 'json'
    }
    if (!requireOption.data) {
      if (requireOption.$currentDataType === 'form') {
        requireOption.data = new FormData()
      } else {
        requireOption.data = {}
      }
    }
    if (!requireOption.params) {
      requireOption.params = {}
    }
    if (requireOption.$responseFormat === undefined) {
      requireOption.$responseFormat = defaultRequireOption.$responseFormat !== undefined ? defaultRequireOption.$responseFormat : true
    }
  }
  require(requireOption: requireOptionType, defaultRequireOption?: defaultRequireOptionType) {
    if (getType(requireOption) != 'object') {
      return Promise.reject({ status: 'fail', code: 'undefined optionData', msg: '未定义请求数据！' })
    } else {
      this.$formatRequireOption(requireOption, defaultRequireOption)
      const ruleItem = this.checkRule(requireOption.url)
      return this.runInstance(new Instance(requireOption, ruleItem), ruleItem)
    }
  }
  runInstance(instance: Instance, ruleItem: Rule, isRefresh?: boolean) {
    return new Promise((resolve, reject) => {
      instance.run(isRefresh).then(() => {
        this.$require(instance, ruleItem, isRefresh).then(res => {
          resolve(res)
        }).catch(err => {
          console.error(err)
          reject(err)
        })
      }).catch(err => {
        console.error(err)
        instance.fail(true, err.msg, 'error')
        reject(err)
      })
    })
  }
  $require(instance: Instance, ruleItem: Rule, isRefresh?: boolean) {
    return new Promise((resolve, reject) => {
      this.ajax(instance.data).then(response => {
        if (instance.data.responseType === undefined || instance.data.responseType == 'json') {
          if (instance.data.$responseFormat) {
            const responseData = ruleItem.format(response, instance)
            if (responseData.status === 'success') {
              resolve(responseData)
            } else if (responseData.status === 'login') {
              if (ruleItem.refreshLogin && !isRefresh) {
                ruleItem.refreshLogin().then(() => {
                  this.runInstance(instance, ruleItem, true).then(res => {
                    resolve(res)
                  }).catch(err => {
                    reject(err)
                  })
                }).catch(err => {
                  reject(err)
                })
              } else {
                instance.fail(false, responseData.msg, 'error')
                // 此处考虑登录的自动或打断实现方案
                reject(responseData)
              }
            } else {
              instance.fail(false, responseData.msg, 'error')
              reject(responseData)
            }
          } else {
            resolve({
              status: 'success',
              code: 'unFormat',
              data: response
            })
          }
        } else {
          resolve({
            status: 'success',
            code: 'unJson',
            type: instance.data.responseType,
            data: response
          })
        }
      }).catch(err => {
        const errRes = this.$formatError(err, instance, ruleItem)
        instance.fail(true, errRes.msg, 'error', '警告')
        reject(errRes)
      })
    })
  }
  $parseStatus (statusNum?: number) {
    if (statusNum && this.status[statusNum]) {
      return this.status[statusNum]
    } else {
      return ''
    }
  }
  $formatError (error: any, instance: Instance, ruleItem: Rule) {
    const errRes: errorType = {
      status: 'fail',
      code: '',
      msg: '',
      instance: instance,
      error: error
    }
    if (error.response) {
      errRes.code = 'server error'
      let msg = ruleItem.fail(errRes)
      if (!msg) {
        msg = this.$parseStatus(error.response.status)
        if (!msg) {
          msg = config.require.fail.server
        }
      }
      errRes.msg = msg
    } else {
      errRes.code = 'require error'
      errRes.msg = config.require.fail.require
    }
    return errRes
  }
  get (optionData: requireOptionType) {
    return this.require(optionData, { method: 'get' })
  }
  post (optionData: requireOptionType) {
    return this.require(optionData, { method: 'post' })
  }
  delete (optionData: requireOptionType) {
    return this.require(optionData, { method: 'delete' })
  }
  put (optionData: requireOptionType) {
    return this.require(optionData, { method: 'put' })
  }
  patch (optionData: requireOptionType) {
    return this.require(optionData, { method: 'patch' })
  }
  purge (optionData: requireOptionType) {
    return this.require(optionData, { method: 'purge' })
  }
  form (optionData: requireOptionType) {
    return this.require(optionData, { method: 'post', $dataType: 'form', $currentDataType: 'form' })
  }
  json (optionData: requireOptionType) {
    return this.require(optionData, { method: 'post', $dataType: 'form' })
  }
  setToken (tokenName: string, data: any, prop = 'default', noSave?: boolean) {
    if (this.rule[prop]) {
      this.rule[prop].setToken(tokenName, data, noSave)
    } else {
      this.$exportMsg(`未找到${prop}对应的处理规则，setToken:${tokenName}操作失败！`)
    }
  }
  getToken (tokenName: string, prop = 'default') {
    if (this.rule[prop]) {
      return this.rule[prop].getToken(tokenName)
    } else {
      this.$exportMsg(`未找到${prop}对应的处理规则，getToken:${tokenName}操作失败！`)
      return false
    }
  }
  clearToken (tokenName: string | true, prop = 'default') {
    if (this.rule[prop]) {
      return this.rule[prop].clearToken(tokenName)
    } else {
      this.$exportMsg(`未找到${prop}对应的处理规则，clearToken:${tokenName}操作失败！`)
      return false
    }
  }
  /**
   * 删除token
   * @param {string} tokenName token名称
   * @param {string} prop 对应的rule.prop
   * @returns {boolean}
   */
  destroyToken (tokenName: string | true, prop = 'default') {
    if (this.rule[prop]) {
      return this.rule[prop].destroyToken(tokenName)
    } else {
      this.$exportMsg(`未找到${prop}对应的处理规则，destroyToken:${tokenName}操作失败！`)
      return false
    }
  }
  clearAllToken() {
    for (const prop in this.rule) {
      const ruleItem = this.rule[prop]
      ruleItem.clearToken(true)
    }
  }
  destroyAllToken() {
    for (const prop in this.rule) {
      const ruleItem = this.rule[prop]
      ruleItem.destroyToken(true)
    }
  }
  $selfName () {
    const ruleName = []
    for (const n in this.rule) {
      ruleName.push(this.rule[n].$selfName())
    }
    return `(require:[${ruleName.join(',')}])`
  }
}

export default Require
