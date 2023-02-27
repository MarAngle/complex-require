import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { Data } from 'complex-utils'
import { isArray, jsonToForm } from 'complex-utils'
import config from '../config'

type statusType = {
  [prop: number]: string
}

interface RequireOption<D = any> extends AxiosRequestConfig<D> {
  $dataType?: 'json' | 'form'
  $currentDataType?: 'json' | 'form'
}

export type initOptionType = {
  baseURL?: string
  option?: AxiosRequestConfig
  status?: statusType,
  formatUrl?: (url: string, baseURL: string) => string
}

class Require extends Data {
  static $name = 'Require'
  service: AxiosInstance
  baseURL: string
  status: statusType
  constructor(initOption: initOptionType) {
    super()
    this.service = this.$buildService(initOption.option)
    this.baseURL = initOption.baseURL || ''
    this.status = {}
    if (initOption.status) {
      for (const n in initOption.status) {
        this.status[n] = initOption.status[n]
      }
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
  // require (optionData, defaultOptionData) {
  //   const check = this.$check(optionData, defaultOptionData)
  //   if (check.next) {
  //     if (optionData.requestDataType == 'form') {
  //       if (optionData.headers['Content-Type'] === undefined) {
  //         optionData.headers['Content-Type'] = config.Require.formContentType
  //       }
  //       if (optionData.requestCurrentDataType == 'json') {
  //         optionData.data = jsonToForm(optionData.data)
  //       }
  //     } else if (optionData.requestDataType == 'json') {
  //       optionData.data = JSON.stringify(optionData.data)
  //     }
  //     // 新版本单独处理此逻辑
  //     if (optionData.params) {
  //       for (const n in optionData.params) {
  //         if (isArray(optionData.params[n])) {
  //           optionData.params[n] = optionData.params[n].join(',')
  //         }
  //       }
  //     }
  //     return this.$requireNext(optionData, check)
  //   } else {
  //     this.$showFailMsg(true, optionData.failMsg, check.msg, 'error')
  //     return Promise.reject({ status: 'fail', ...check })
  //   }
  // }

}

export default Require
