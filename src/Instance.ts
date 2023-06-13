import { AxiosRequestConfig } from 'axios'
import { notice } from 'complex-plugin'
import { noticeMsgType } from 'complex-plugin/src/notice'
import Require from './Require'
import Rule from './Rule'
import { locationType } from './Token'
import { appendProp, jsonToForm } from 'complex-utils'
import config from '../config'

export type failType = {
  check?: boolean
  content?: string
  duration?: number
  type?: noticeMsgType
  title?: string
}

export interface customParameters {
  $dataType?: 'json' | 'form' | 'origin' // 目标数据格式
  $currentDataType?: 'json' | 'form' // 当前数据格式
  $responseFormat?: boolean // 返回值格式化
  $fail?: boolean | failType // 错误回调
}

export interface InstanceInitOption<D = any> extends AxiosRequestConfig<D>, customParameters {
  url: string
  token?: boolean | string[]
}

class Instance {
  data: InstanceInitOption
  require: Require
  rule: Rule
  constructor(initOption: InstanceInitOption, require: Require, rule: Rule) {
    initOption.url = rule.formatUrl(initOption.url)
    if (initOption.token === undefined || initOption.token === true) {
      initOption.token = rule.getTokenList()
    } else if (!initOption.token) {
      initOption.token = []
    }
    this.data = initOption
    this.require = require
    this.rule = rule
  }
  appendData(location: locationType, prop: string, data: any) {
    if (location === 'body') {
      if (!this.data.data) {
        if (this.data.$currentDataType === 'json') {
          this.data.data = {}
        } else if (this.data.$currentDataType === 'form') {
          this.data.data = new FormData()
        }
      }
      appendProp(this.data.data, prop, data, this.data.$currentDataType)
    } else if (location === 'header') {
      if (!this.data.headers) {
        this.data.headers = {}
      }
      this.data.headers[prop] = data
    } else if (location === 'params') {
      if (!this.data.params) {
        this.data.params = {}
      }
      this.data.params[prop] = data
    }
  }
  prepareData(isRefresh?: boolean) {
    if (this.data.$dataType === 'form' && !isRefresh) {
      if (!this.data.headers) {
        this.data.headers = {
          'Content-Type': config.Require.formContentType
        }
      } else if (this.data.headers['Content-Type'] === undefined) {
        this.data.headers['Content-Type'] = config.Require.formContentType
      }
      if (this.data.$currentDataType === 'json' && this.data.data) {
        this.data.data = jsonToForm(this.data.data)
        this.data.$currentDataType = 'form'
      }
    } else if (this.data.$dataType === 'json') {
      this.data.data = JSON.stringify(this.data.data)
    }
  }
  restoreData() {
    if (this.data.$dataType === 'json') {
      this.data.data = JSON.parse(this.data.data)
    }
  }
  run(isRefresh?: boolean) {
    return new Promise((resolve, reject) => {
      if (isRefresh) {
        this.restoreData()
      }
      this.rule.formatRequireInstance(this).then(res => {
        this.prepareData(isRefresh)
        resolve(res)
      }).catch(err => {
        reject(err)
      })
    })
  }
  fail(isLocalFail: boolean, content: string | undefined, type: noticeMsgType, title?: string) {
    let option = this.data.$fail
    if (option === undefined || option === true) {
      option = {}
    } else if (!option) {
      return
    }
    const duration = option.duration
    if (isLocalFail && !option.check) {
      // 检查失败时：未单独设置，则此时按照content值为基准，此时的错误是非后端接口造成的
    } else if (option.content) {
      content = option.content
    }
    if (option.type) {
      type = option.type
    }
    if (option.title) {
      title = option.title
    }
    if (content) {
      notice.showMsg(content, type, title, duration)
    }
  }
}

export default Instance
