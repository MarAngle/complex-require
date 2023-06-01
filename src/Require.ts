import axios, { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders } from 'axios'
import { notice } from 'complex-plugin'
import { noticeMsgType } from 'complex-plugin/src/notice'
import { Data } from 'complex-utils'
import { getType, jsonToForm, getEnv } from 'complex-utils'
import RequireRule, { initOptionType as RequireRuleInitOptionType } from './RequireRule'
import config from '../config'

type statusType = {
  [prop: number]: string
}

type failType = {
  check?: boolean,
  content?: string,
  duration?: number,
  type?: noticeMsgType,
  title?: string
}

interface customParameters {
  $dataType?: 'json' | 'form' // 目标数据格式
  $currentDataType?: 'json' | 'form' // 当前数据格式
  $responseFormat?: boolean // 返回值格式化
  $fail?: boolean | failType // 错误回调
}

export interface RequireOption<D = any> extends AxiosRequestConfig<D>, customParameters {
  url: string,
  token?: boolean | string[]
}

export interface IsFormatRequireOption<D = any> extends RequireOption {
  headers: AxiosRequestHeaders,
  data: D,
  params: any
}

interface defaultRequireOption extends customParameters {
  method?: RequireOption['method']
}

type requireErrResType = {
  status: string,
  code: string,
  msg: string,
  optionData: IsFormatRequireOption,
  error: any
}

export type initOptionType = {
  baseURL?: string
  option?: AxiosRequestConfig
  status?: statusType,
  formatUrl?: (url: string, baseURL: string) => string,
  rule: RequireRuleInitOptionType[]
}

export type RequireMethod = 'get' | 'post' | 'delete' | 'put' | 'patch' | 'purge' | 'form' | 'json'

class Require extends Data {
  static $name = 'Require'
  service: AxiosInstance
  baseURL: string
  status: statusType
  rule: {
    [prop: PropertyKey]: RequireRule
  }
  formatUrl?: (url: string, baseURL: string) => string
  constructor(initOption: initOptionType) {
    super()
    this.service = this.$buildService(initOption.option)
    this.formatUrl = initOption.formatUrl
    this.baseURL = initOption.baseURL || ''
    this.status = {
      403: '拒绝访问!',
      404: '很抱歉，资源未找到!',
      504: '网络超时!'
    }
    if (initOption.status) {
      for (const n in initOption.status) {
        this.status[n] = initOption.status[n]
      }
    }
    this.rule = {}
    let defaultProp
    for (const n in initOption.rule) {
      const ruleOption = initOption.rule[n]
      this.rule[ruleOption.prop] = new RequireRule(ruleOption)
      if (defaultProp === undefined) {
        defaultProp = ruleOption.prop
      }
    }
    if (defaultProp !== undefined) {
      if (!this.rule.default) {
        this.rule.default = this.rule[defaultProp]
      }
      if (getEnv('real') == 'development' && config.Require.devShowRule) {
        this.$exportMsg(`默认的请求处理规则为[${this.rule.default.$selfName()}]`, 'log')
      }
    } else {
      this.$exportMsg(`未传递请求处理规则！`, 'error')
    }
  }
  changeBaseUrl(baseURL: string) {
    this.baseURL = baseURL || ''
  }
  /**
   * 构建service
   * @param {*} option
   * @returns {axios}
   */
  $buildService(option?: AxiosRequestConfig) {
    return axios.create(this.$buildOption(option))
  }
  /**
   * 创建option
   * @param {object} option
   * @returns {object}
   */
  $buildOption (option: AxiosRequestConfig = {}) {
    if (!option.headers) {
      option.headers = {}
    }
    if (!option.headers['Content-Type']) {
      option.headers['Content-Type'] = 'text/plain;charset=UTF-8'
    }
    return option
  }
  /**
   * 调用service进行axios请求
   * @param {*} optionData
   * @returns {Promise}
   */
  ajax (optionData: RequireOption) {
    return new Promise((resolve, reject) => {
      this.service(optionData).then(response => {
        resolve(response)
      }).catch(error => {
        reject(error)
      })
    })
  }
  $formatUrl (url: string) {
    if (this.formatUrl) {
      return this.formatUrl(url, this.baseURL)
    } else {
      if (this.baseURL && url.indexOf('https://') != 0 && url.indexOf('http://') != 0) {
        // 当前URL不以http/https开始，则认为此URL需要添加默认前缀
        url = this.baseURL + url
      }
      return url
    }
  }
  getRule(ruleProp = 'default') {
    return this.rule[ruleProp]
  }
  $getRule (url: string): RequireRule {
    for (const prop in this.rule) {
      if (this.rule[prop].checkUrl(url)) {
        return this.rule[prop]
      }
    }
    return this.rule.default
  }
  $formatOptionData(optionData: RequireOption, defaultOptionData: defaultRequireOption = {}, isRefresh?: boolean) {
    if (getType(optionData, true) != 'object') {
      return Promise.reject({ status: 'fail', code: 'undefined optionData', msg: '未定义请求数据！' })
    } else {
      if (!isRefresh) {
        optionData.url = this.$formatUrl(optionData.url)
        // 添加默认值
        if (!optionData.method) {
          optionData.method = defaultOptionData.method || 'get'
        }
        if (!optionData.headers) {
          optionData.headers = {}
        }
        if (!optionData.$dataType) {
          optionData.$dataType = defaultOptionData.$dataType || 'json'
        }
        if (!optionData.$currentDataType) {
          optionData.$currentDataType = defaultOptionData.$currentDataType || 'json'
        }
        if (!optionData.data) {
          if (optionData.$currentDataType === 'form') {
            optionData.data = new FormData()
          } else {
            optionData.data = {}
          }
        }
        if (!optionData.params) {
          optionData.params = {}
        }
        if (optionData.$responseFormat === undefined) {
          optionData.$responseFormat = defaultOptionData.$responseFormat !== undefined ? defaultOptionData.$responseFormat : true
        }
      }
      // 检查RULE
      return this.$getRule(optionData.url).formatRequire(optionData as IsFormatRequireOption, isRefresh)
    }
  }
  $showFailMsg (checkFail: boolean, failOption: customParameters['$fail'], content: string | undefined, type: noticeMsgType, title?: string) {
    if (failOption === undefined || failOption === true) {
      failOption = {}
    } else if (!failOption) {
      return
    }
    const duration = failOption.duration
    if (checkFail && !failOption.check) {
      // 检查失败时：未单独设置，则此时按照content值为基准，此时的错误是非后端接口造成的
    } else if (failOption.content) {
      content = failOption.content
    }
    if (failOption.type) {
      type = failOption.type
    }
    if (failOption.title) {
      title = failOption.title
    }
    if (content) {
      notice.showMsg(content, type, title, duration)
    }
  }
  require (optionData: RequireOption, defaultOptionData?: defaultRequireOption, isRefresh?: boolean) {
    return new Promise((resolve, reject) => {
      this.$formatOptionData(optionData, defaultOptionData, isRefresh).then(res => {
        if (optionData.$dataType == 'form') {
          if ((optionData as IsFormatRequireOption).headers['Content-Type'] === undefined) {
            (optionData as IsFormatRequireOption).headers['Content-Type'] = config.Require.formContentType
          }
          if (optionData.$currentDataType == 'json') {
            optionData.data = jsonToForm(optionData.data)
          }
        } else if (optionData.$dataType == 'json') {
          optionData.data = JSON.stringify(optionData.data)
        }
        this.$require(optionData as IsFormatRequireOption, res.data, isRefresh).then(res => {
          resolve(res)
        }).catch(err => {
          reject(err)
        })
      }).catch(err => {
        this.$showFailMsg(true, optionData.$fail, err.msg, 'error')
        reject(err)
      })
    })
  }
  $require (optionData: IsFormatRequireOption, ruleItem: RequireRule, isRefresh?: boolean) {
    return new Promise((resolve, reject) => {
      this.ajax(optionData).then(response => {
        if (!optionData.responseType || optionData.responseType == 'json') {
          if (optionData.$responseFormat) {
            const responseData = ruleItem.formatResponse(response, optionData)
            if (responseData.status == 'success') {
              resolve(responseData)
            } else if (responseData.status == 'login') {
              if (ruleItem.refreshLogin && !isRefresh) {
                ruleItem.refreshLogin().then(() => {
                  optionData.$currentDataType = optionData.$dataType
                  this.require(optionData, {}, true).then(res => {
                    resolve(res)
                  }).catch(err => {
                    reject(err)
                  })
                }).catch(err => {
                  reject(err)
                })
              } else {
                this.$showFailMsg(false, optionData.$fail, responseData.msg, 'error')
                // 此处考虑登录的自动或打断实现方案
                reject(responseData)
              }
            } else if (responseData.status == 'fail') {
              this.$showFailMsg(false, optionData.$fail, responseData.msg, 'error')
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
            data: response
          })
        }
      }, error => {
        console.error(error)
        const errRes = this.$requireFail(error, optionData, ruleItem)
        this.$showFailMsg(true, optionData.$fail, errRes.msg, 'error', '警告')
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
  $requireFail (error: any, optionData: IsFormatRequireOption, ruleItem: RequireRule) {
    const errRes: requireErrResType = {
      status: 'fail',
      code: '',
      msg: '',
      optionData: optionData,
      error: error
    }
    if (error.response) {
      errRes.code = 'server error'
      if (errRes.msg === undefined) {
        let msg = ruleItem.$requireFail(errRes)
        if (!msg) {
          msg = this.$parseStatus(error.response.status)
          if (!msg) {
            msg = config.Require.failMsg
          }
        }
        errRes.msg = msg
      }
    } else {
      errRes.code = 'require error'
      errRes.msg = config.Require.failMsg
    }
    return errRes
  }
  get (optionData: RequireOption) {
    return this.require(optionData, { method: 'get' })
  }
  post (optionData: RequireOption) {
    return this.require(optionData, { method: 'post' })
  }
  delete (optionData: RequireOption) {
    return this.require(optionData, { method: 'delete' })
  }
  put (optionData: RequireOption) {
    return this.require(optionData, { method: 'put' })
  }
  patch (optionData: RequireOption) {
    return this.require(optionData, { method: 'patch' })
  }
  purge (optionData: RequireOption) {
    return this.require(optionData, { method: 'purge' })
  }
  form (optionData: RequireOption) {
    return this.require(optionData, { method: 'post', $dataType: 'form', $currentDataType: 'form' })
  }
  json (optionData: RequireOption) {
    return this.require(optionData, { method: 'post', $dataType: 'form' })
  }
  setToken (tokenName: string, data: any, prop = 'default', noSave?: boolean) {
    if (this.rule[prop]) {
      this.rule[prop].setToken(tokenName, data, noSave)
    } else {
      this.$exportMsg(`未找到[${tokenName}:${prop}]对应的处理规则，setToken操作失败！`)
    }
  }
  getToken (tokenName: string, prop = 'default') {
    if (this.rule[prop]) {
      return this.rule[prop].getToken(tokenName)
    } else {
      this.$exportMsg(`未找到[${tokenName}:${prop}]对应的处理规则，getToken操作失败！`)
      return false
    }
  }
  clearToken (tokenName: string | true, prop = 'default') {
    if (this.rule[prop]) {
      return this.rule[prop].clearToken(tokenName)
    } else {
      this.$exportMsg(`未找到[${tokenName}:${prop}]对应的处理规则，clearToken操作失败！`)
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
      this.$exportMsg(`未找到[${tokenName}:${prop}]对应的处理规则，destroyToken操作失败！`)
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
