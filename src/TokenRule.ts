import { isExist, setLocalData, getLocalData, removeLocalData, setSessionLocalData, getSessionLocalData, removeSessionLocalData, Data } from 'complex-utils'
import config from '../config'

type getDataType = () => any
type checkDataType = (data: any) => boolean
type clearDataType = (parentProp: string) => any
type destroyDataType = clearDataType

type initOptionObject = {
  data?: any
  require?: boolean
  location?: string
  empty?: boolean
  time?: number
  session?: boolean
  getData?: getDataType
  checkData?: checkDataType
  clearData?: clearDataType
  destroyData?: destroyDataType
}

export type initOptionType = string | initOptionObject

class TokenRule extends Data {
  static $name = 'TokenRule'
  prop: string
  require: boolean
  data: any
  location: string
  empty: boolean
  time?: number
  session?: boolean
  $getData: false | getDataType
  $checkData: checkDataType
  $clearData: false | clearDataType
  $destroyData: false | destroyDataType
  constructor(prop: string, initOption: initOptionType) {
    super()
    if (typeof initOption !== 'object') {
      initOption = {
        data: initOption
      }
    }
    this.prop = prop
    this.require = initOption.require || false
    this.data = initOption.data || undefined
    this.location = initOption.location || config.TokenRule.location
    this.empty = initOption.empty === undefined ? false : initOption.empty
    this.session = initOption.session
    this.time = initOption.time
    this.$getData = initOption.getData || false
    this.$clearData = initOption.clearData || false
    this.$destroyData = initOption.destroyData || false
    this.$checkData = initOption.checkData || function(data) {
      return isExist(data)
    }
  }
  $getProp(parentProp: string) {
    return `require-${parentProp}-${this.prop}`
  }
  setData(parentProp: string, data: any, noSave?: boolean) {
    this.data = data
    if (!noSave) {
      (!this.session ? setLocalData: setSessionLocalData)(this.$getProp(parentProp), data)
    }
  }
  getData(parentProp: string) {
    let data = this.$getData ? this.$getData() : this.data
    if (!this.$checkData(data)) {
      data = (!this.session ? getLocalData : getSessionLocalData)(this.$getProp(parentProp), this.time)
      if (this.$checkData(data)) {
        this.setData(parentProp, data, true)
      }
    }
    return data
  }
  checkData(data: any): 'success' | 'fail' | '' {
    let next: 'success' | 'fail' | '' = 'success'
    if (!this.$checkData(data)) {
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
  $removeData(parentProp: string) {
    (!this.session ? removeLocalData : removeSessionLocalData)(this.$getProp(parentProp))
    this.data = undefined
  }
  clearData(parentProp: string) {
    this.$removeData(parentProp)
    if (this.$clearData) {
      this.$clearData(parentProp)
    }
  }
  destroyData(parentProp: string) {
    this.$removeData(parentProp)
    if (this.$destroyData) {
      this.$destroyData(parentProp)
    }
  }
}

export default TokenRule
