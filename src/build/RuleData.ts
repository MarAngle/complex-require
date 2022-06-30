import $func from "complex-func"
import { objectAny } from "complex-func/ts/index"
import Data from './Data'

const base = {
  num: '0-9',
  letter: {
    small: 'a-z',
    big: 'A-Z'
  },
  text: '\u4e00-\u9fa5',
  bd: {
    z: '，。？！‘’”“<>%',
    y: ',.?!\'\'""《》%'
  }
}

export type initOptionType = {
  type?: string,
  data?: any
  build?: any,
  merge?: any
}

// 规则校验数据
class RuleData extends Data {
  type?: string
  data?: any
  build?: any
  merge?: any
  constructor (initOption?: initOptionType) {
    super()
    if (initOption) {
      this.$initMain(initOption)
    }
  }
  /**
   * 加载
   * @param {*} initOption 参数
   */
  $initMain(initOption?: initOptionType) {
    if (!initOption) {
      this.$exportMsg('init无参数!')
      return false
    }
    // 类型
    this.type = initOption.type || 'reg'
    if (initOption.build) {
      this.$buildData(initOption)
    } else {
      this.data = initOption.data
    }
    // 是否组合模式
    this.merge = this.$formatMerge(initOption.merge)
  }
  /**
   * 格式化组合数据
   * @param {true | object} [mergeData] 组合式初始化数据
   * @returns {undefined | object}
   */
  $formatMerge(mergeData: any) {
    if (mergeData) {
      if (mergeData === true) {
        mergeData = {}
      }
      if (!mergeData.limit) {
        mergeData.limit = {}
      }
      if (mergeData.limit.start === undefined) {
        mergeData.limit.start = '^'
      }
      if (mergeData.limit.end === undefined) {
        mergeData.limit.end = '$'
      }
      if (!mergeData.num) {
        mergeData.num = {}
      }
      if (mergeData.num.min === undefined) {
        mergeData.num.min = '1'
      }
      if (mergeData.num.max === undefined) {
        mergeData.num.max = ''
      }
    }
    return mergeData
  }
  /**
   * 初始化数据
   * @param {object} initOption 数据
   */
  $buildData(initOption: initOptionType) {
    if (this.type == 'reg') {
      if (initOption.merge === undefined) {
        initOption.merge = true
      }
      this.data = this.$buildRegData(initOption.build, base)
    }
  }
  /**
   * 创建RegStr数据
   * @param {undefined | true | object} propObject 指定的属性prop
   * @param {object} data 属性prop的归属数据
   * @returns {string}
   */
  $buildRegData(propObject: true | objectAny, data: objectAny) {
    let regStr = ''
    if (propObject === true) {
      for (const n in data) {
        const info = data[n]
        if ($func.getType(info) == 'object') {
          regStr += this.$buildRegData(true, info)
        } else {
          regStr += info
        }
      }
    } else {
      const type = $func.getType(propObject)
      if (type == 'object') {
        for (const i in propObject) {
          const prop = propObject[i]
          const info = data[i]
          if ($func.getType(info) === 'object') {
            regStr += this.$buildRegData($func.getType(prop) === 'string' ? true : prop, info)
          } else {
            regStr += info
          }
        }
      }
    }
    return regStr
  }
  /**
   * 根据mergeData生成regstr
   * @param {string} regData regstr
   * @param {object} mergeData 组合数据
   * @returns {string}
   */
  $buildRegStr(regData: any, mergeData: any) {
    return `${mergeData.limit.start}[${regData}]{${mergeData.num.min},${mergeData.num.max}}${mergeData.limit.end}`
  }
  /**
   * 根据regstr生成Reg
   * @param {string} regData regstr
   * @param {object} mergeData 组合数据
   * @returns {RegExp}
   */
  $buildReg(regData: any, mergeData: any) {
    return new RegExp(this.$buildRegStr(regData, mergeData))
  }
  /**
   * 检查数据
   * @param {*} data 需要检查的数据
   * @param {*} option 选项
   * @returns {boolean}
   */
  check(data: any, option: any = {}) {
    if (this.type == 'reg') {
      let reg = this.data
      if (option.merge) {
        option.merge = this.$formatMerge(option.merge)
      }
      const merge = option.merge || this.merge
      if (merge) {
        reg = this.$buildReg(reg, merge)
      }
      const type = $func.getType(reg, true)
      if (type != 'regexp') {
        reg = new RegExp(reg)
      }
      return reg.test(data)
    } else if (this.type == 'func') {
      return this.data(data, option)
    }
  }
}

RuleData.$name = 'RuleData'

export default RuleData
