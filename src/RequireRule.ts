import { Data } from 'complex-utils'

export type initOptionType = {
  name: string,
  prop: string
}

class RequireRule extends Data {
  constructor(initOption: initOptionType) {
    super()
  }
}


export default RequireRule
