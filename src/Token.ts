import { isExist, setLocalData, getLocalData, removeLocalData, setSessionLocalData, getSessionLocalData, removeSessionLocalData } from 'complex-utils'

type getDataType = () => any
type removeDataType = getDataType
type clearDataType = getDataType
type hasDataType = (data: any) => boolean
type destroyDataType = clearDataType

export type locationType = 'body' | 'header' | 'params'

export interface TokenInitOption {
  data?: any
  require?: boolean
  location?: locationType
  empty?: boolean
  time?: number
  session?: boolean
  getData?: getDataType
  hasData?: hasDataType
  clearData?: clearDataType
  destroyData?: destroyDataType
}

function hasData(data: any) {
  return isExist(data)
}

function setData(this: Token, data: any, noSave?: boolean) {
  this.data = data
  if (!noSave) {
    setLocalData(this.prop, data)
  }
}
function setDataBySession(this: Token, data: any, noSave?: boolean) {
  this.data = data
  if (!noSave) {
    setSessionLocalData(this.prop, data)
  }
}

function getData(this: Token) {
  let data = this.$getData!()
  if (!this.$hasData(data)) {
    data = getLocalData(this.prop, this.time)
    if (this.$hasData(data)) {
      this.setData(data, true)
    }
  }
  return data
}
function getDataBySession(this: Token) {
  let data = this.$getData!()
  if (!this.$hasData(data)) {
    data = getSessionLocalData(this.prop, this.time)
    if (this.$hasData(data)) {
      this.setData(data, true)
    }
  }
  return data
}
function getDataByData(this: Token) {
  let data = this.data
  if (!this.$hasData(data)) {
    data = getLocalData(this.prop, this.time)
    if (this.$hasData(data)) {
      this.setData(data, true)
    }
  }
  return data
}
function getDataByDataBySession(this: Token) {
  let data = this.data
  if (!this.$hasData(data)) {
    data = getSessionLocalData(this.prop, this.time)
    if (this.$hasData(data)) {
      this.setData(data, true)
    }
  }
  return data
}

function removeData(this: Token) {
  removeLocalData(this.prop)
  this.data = undefined
}
function removeDataBySession(this: Token) {
  removeSessionLocalData(this.prop)
  this.data = undefined
}

class Token {
  static $name = 'Token'
  prop: string
  require?: boolean
  data: any
  location: locationType
  empty: boolean
  time: undefined | number
  $getData?: getDataType
  $hasData: hasDataType
  $clearData?: clearDataType
  $destroyData?: destroyDataType
  setData: (data: any, noSave?: boolean) => void
  getData: getDataType
  removeData: removeDataType
  constructor(initOption: TokenInitOption, prop: string, ruleProp: string, time?: number, session?: boolean) {
    if (typeof initOption !== 'object') {
      initOption = {
        data: initOption
      }
    }
    this.prop = `require-${prop}-${ruleProp}`
    this.require = initOption.require
    this.data = initOption.data || undefined
    this.location = initOption.location || 'body'
    this.empty = initOption.empty === undefined ? false : initOption.empty
    this.time = initOption.time === undefined ? time : initOption.time
    if (initOption.session !== undefined) {
      session = initOption.session
    }
    this.$clearData = initOption.clearData
    this.$destroyData = initOption.destroyData
    this.$hasData = initOption.hasData || hasData
    this.setData = !session ? setData : setDataBySession
    if (initOption.getData) {
      this.$getData = initOption.getData
      this.getData = !session ? getData : getDataBySession
    } else {
      this.getData = !session ? getDataByData : getDataByDataBySession
    }
    this.removeData = !session ? removeData : removeDataBySession
  }
  hasData(data: any) {
    let hasStatus: 'exist' | 'empty' | '' = 'exist'
    if (!this.$hasData(data)) {
      // 当前值检查判断为不存在
      if (this.require) {
        hasStatus = 'empty'
      } else if (!this.empty) {
        // 值不存在且不要求时,empty为否不上传空值,此时为'',不进行append操作
        hasStatus = ''
      }
      // 值不存在且不要求时,传递,此时为hasStatus
    }
    return hasStatus
  }
  clearData() {
    this.removeData()
    if (this.$clearData) {
      this.$clearData()
    }
  }
  destroyData() {
    this.removeData()
    if (this.$destroyData) {
      this.$destroyData()
    }
  }
}

export default Token
