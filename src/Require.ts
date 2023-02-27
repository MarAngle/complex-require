import axios, { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders } from 'axios'
import { notice } from 'complex-func'
import { noticeMsgType } from 'complex-func/src/notice'
import { Data } from 'complex-utils'
import { isArray, getType, jsonToForm, getEnv } from 'complex-utils'
import config from '../config'
import RequireRule, { initOptionType as RequireRuleInitOptionType } from './RequireRule'

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
  $dataType?: 'json' | 'form'
  $currentDataType?: 'json' | 'form'
  $responseFormat?: boolean
  $fail?: boolean | failType
}

interface RequireOption<D = any> extends AxiosRequestConfig<D>, customParameters {
  url: string
}

interface IsFormatRequireOption<D = any> extends RequireOption {
  headers: AxiosRequestHeaders,
  data: D,
  params: any
}

interface checkType {
  next: boolean,
  code: string,
  msg: string,
  ruleItem?: RequireRule
}

interface successCheckType {
  next: boolean,
  code: string,
  msg: string,
  ruleItem: RequireRule
}

type requireErrResType = {
  status: string,
  code: string,
  msg: string,
  optionData: any,
  error: any
}

export type initOptionType = {
  baseURL?: string
  option?: AxiosRequestConfig
  status?: statusType,
  formatUrl?: (url: string, baseURL: string) => string,
  rule: RequireRuleInitOptionType[]
}

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
    this.status = {}
    if (initOption.status) {
      for (const n in initOption.status) {
        this.status[n] = initOption.status[n]
      }
    }
    this.rule = {}
    let firstProp
    for (const n in initOption.rule) {
      const ruleOption = initOption.rule[n]
      this.rule[ruleOption.prop] = new RequireRule(ruleOption)
      if (firstProp === undefined) {
        firstProp = ruleOption.prop
      }
    }
    if (firstProp !== undefined) {
      if (!this.rule.default) {
        this.rule.default = this.rule[firstProp as string]
      }
      if (getEnv('real') == 'development' && config.Require.devShowRule) {
        this.$exportMsg(`默认的请求规则处理程序为[${this.rule.default.$selfName()}]`, 'log')
      }
    } else {
      this.$exportMsg(`未传递请求规则！`, 'error')
    }
  }
  /**
   * 构建service
   * @param {*} option
   * @returns {axios}
   */
  $buildService(option?:AxiosRequestConfig) {
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
  $checkRule (url: string): RequireRule {
    for (const n in this.rule) {
      const fg = this.rule[n].check(url)
      if (fg) {
        return this.rule[n]
      }
    }
    return this.rule.default
  }
  $check (optionData: RequireOption, defaultOptionData: customParameters = {}) {
    const check: checkType = {
      next: true,
      code: '',
      msg: ''
    }
    // 检查参数
    if (getType(optionData, true) != 'object') {
      check.next = false
      check.code = 'undefined optionData'
      check.msg = '未定义请求数据'
    } else {
      optionData.url = this.$formatUrl(optionData.url)
      // 检查RULE
      const ruleItem = this.$checkRule(optionData.url)
      // 添加默认值
      if (!optionData.headers) {
        optionData.headers = {}
      }
      if (!optionData.data) {
        optionData.data = {}
      }
      if (!optionData.params) {
        optionData.params = {}
      }
      if (!optionData.$dataType && defaultOptionData.$dataType) {
        optionData.$dataType = defaultOptionData.$dataType
      }
      if (!optionData.$currentDataType && defaultOptionData.$currentDataType) {
        optionData.$currentDataType = defaultOptionData.$currentDataType
      }
      if (optionData.$responseFormat === undefined && defaultOptionData.$responseFormat !== undefined) {
        optionData.$responseFormat = defaultOptionData.$responseFormat === undefined ? true : defaultOptionData.$responseFormat
      }
      // RequireRule检查
      const ruleCheck = ruleItem.format(optionData)
      if (ruleCheck && !ruleCheck.next) {
        check.next = false
        check.code = ruleCheck.code
        check.msg = ruleCheck.msg
        ruleItem.tokenFail(ruleCheck.prop)
      } else {
        check.ruleItem = ruleItem
      }
    }
    return check
  }
  $showFailMsg (checkFail: boolean, failOption: customParameters['$fail'], content: string, type: noticeMsgType, title?: string) {
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
  require (optionData: RequireOption, defaultOptionData?: customParameters) {
    const check = this.$check(optionData, defaultOptionData)
    if (check.next) {
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
      // 新版本单独处理此逻辑
      if (optionData.params) {
        for (const n in optionData.params) {
          if (isArray(optionData.params[n])) {
            optionData.params[n] = optionData.params[n].join(',')
          }
        }
      }
      return this.$requireNext(optionData as IsFormatRequireOption, check as successCheckType)
    } else {
      this.$showFailMsg(true, optionData.$fail, check.msg, 'error')
      return Promise.reject({ status: 'fail', ...check })
    }
  }
  $requireNext (optionData: IsFormatRequireOption, check: successCheckType) {
    return new Promise((resolve, reject) => {
      this.ajax(optionData).then(response => {
        if (optionData.$responseFormat && (!optionData.responseType || optionData.responseType == 'json')) {
          const nextdata = check.ruleItem.check(response, optionData)
          if (nextdata.status == 'success') {
            resolve(nextdata)
          } else if (nextdata.status == 'login') {
            this.$showFailMsg(false, optionData.$fail, nextdata.msg, 'error')
            reject(nextdata)
          } else if (nextdata.status == 'fail') {
            this.$showFailMsg(false, optionData.$fail, nextdata.msg, 'error')
            reject(nextdata)
          }
        } else if (!optionData.$responseFormat) {
          resolve({
            status: 'success',
            code: 'unFormat',
            data: response
          })
        } else {
          resolve({
            status: 'success',
            code: 'unJson',
            data: response
          })
        }
      }, error => {
        console.error(error)
        const errRes = this.$requireFail(error, optionData, check.ruleItem)
        this.$showFailMsg(true, optionData.$fail, errRes.msg, 'error', '警告')
        reject(errRes)
      })
    })
  }
  $parseStatus (status?: number) {
    if (status && this.status[status]) {
      return this.status[status]
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
      let msg = ruleItem.requireFail(errRes)
      if (!msg) {
        msg = this.$parseStatus(error.response.status)
        if (!msg) {
          msg = config.Require.failMsg
        }
      }
      if (errRes.msg === undefined) {
        errRes.msg = msg
      }
    } else {
      errRes.code = 'require error'
      errRes.msg = config.Require.failMsg
    }
    return errRes
  }

}

export default Require
