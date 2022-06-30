import $func from 'complex-func'
import Data from './Data'
import config from '../../config'
type getDataType = () => any

type checkDataType = (data: any) => boolean

type removeDataType = (isDelete: undefined | boolean, parentProp: string) => any

type initOptionObject = {
  data?: any,
  require?: boolean,
  location?: string,
  empty?: boolean,
  getData?: getDataType,
  checkData?: checkDataType,
  removeData?: removeDataType,
}

export type initOptionType = string | initOptionObject


class TokenRule extends Data {
  prop: string
  require: boolean
  data: any
  location: string
  empty: boolean
  getCurrentData: false | getDataType
  checkCurrentData: checkDataType
  removeCurrentData: false | removeDataType
  constructor (prop: string, initOption: initOptionType) {
    super()
    const type = $func.getType(initOption)
    if (type !== 'object') {
      initOption = {
        data: initOption
      }
    }
    this.prop = prop
    this.require = (initOption as initOptionObject).require || false
    this.data = (initOption as initOptionObject).data || undefined
    this.location = (initOption as initOptionObject).location || config.TokenRule.location
    this.empty = (initOption as initOptionObject).empty === undefined ? false : ((initOption as initOptionObject).empty as true)
    this.getCurrentData = (initOption as initOptionObject).getData || false
    this.removeCurrentData = (initOption as initOptionObject).removeData || false
    this.checkCurrentData = (initOption as initOptionObject).checkData || function(data) {
      return $func.isExist(data)
    }
  }
  /**
   * 生成local的name
   * @param {string} parentProp 父RequireRule的prop属性
   * @returns {string}
   */
  $buildLocalTokenName(parentProp: string) {
    return `${parentProp || ''}-${this.prop}`
  }
  /**
   * 设置token值
   * @param {string} parentProp 父RequireRule的prop属性
   * @param {*} data token值
   * @param {boolean} [noSave] 不保存到local的判断值
   */
  setData(parentProp: string, data: any, noSave?: boolean) {
    this.data = data
    if (!noSave) {
      $func.setLocalData(this.$buildLocalTokenName(parentProp), data)
    }
  }
  /**
   * 获取token值
   * @param {string} parentProp 父RequireRule的prop属性
   * @returns {*}
   */
  getData(parentProp: string) {
    let data = this.getCurrentData ? this.getCurrentData() : this.data
    if (!this.checkCurrentData(data)) {
      data = $func.getLocalData(this.$buildLocalTokenName(parentProp))
      if (this.checkCurrentData(data)) {
        this.setData(parentProp, data, true)
      }
    }
    return data
  }
  /**
   * 检查值是否存在
   * @param {*} data 需要检查的值
   * @returns {'success' | 'fail' | ''}
   */
  checkData(data: any): 'success' | 'fail' | '' {
    let next: 'success' | 'fail' | '' = 'success'
    if (!this.checkCurrentData(data)) {
      // 当前值检查判断为不存在
      if (this.require) {
        next = 'fail'
      } else if (!this.empty) {
        next = ''
        // 值不存在且不要求时,empty为否不上传空值,此时为'',不进行append操作
      }
      // 值不存在且不要求时,传递,此时为success
    }
    return next
  }
  /**
   * 清除token数据
   * @param {string} parentProp 父RequireRule的prop属性
   * @param {boolean} isDelete 是否进行删除
   */
  removeData(parentProp: string, isDelete?: boolean) {
    $func.removeLocalData(this.$buildLocalTokenName(parentProp))
    this.data = undefined
    if (this.removeCurrentData) {
      this.removeCurrentData(isDelete, parentProp)
    }
  }
}

TokenRule.$name = 'TokenRule'

export default TokenRule
