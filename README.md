# 基本功能
- 深度封装请求函数,基于axios,实现请求规则的实现,cookie暂不考虑,根据需求改动

# 函数列表

### ajax
  > ### 说明
  > - 调用service进行axios请求,此请求不会进行本地化处理
  > ### 参数
  > - optionData:object,设置项,参照axios文档
  > ### 返回值
  > - ajax:Promise
### require
  > ### 说明
  > - 请求主函数,上传数据判断格式化,返回数据判断格式化
  > ### 参数
  > - optionData:object,设置项,其他项参照axios文档
  > - optionData.url:string,请求地址
  > - optionData.method?:string,请求方式,默认为get
  > - optionData.params?:object,url(query参数)
  > - optionData.data?:object,body参数
  > - optionData.headers?:object,header参数
  > - optionData.token?:string | string[],token设置项,不传根据token设置自动进行所有token的获取,传递string | string\[]根据string获取对应token
  > - optionData.responseType?:'arraybuffer', 'blob', 'document', 'json', 'text', 'stream',返回数据类型,仅返回json时对返回数据进行判断和格式化,默认值为json
  > - optionData.$dataType?:'json' | 'formdata',接口需要的数据类型,默认值为json
  > - optionData.$currentDataType?:'json' | 'formdata',当前data的数据类型,默认值为json
  > - optionData.responseFormat?:boolean,是否对返回数据进行分析和格式化,默认为true
  > - optionData.defaultOptionData?:object,默认参数重置method/$dataType/$currentDataType/responseType
  > ### 返回值
  > - :Promise
### get
  > ### 说明
  > - get/require,defaultOptionData = { method: 'get' }
  > ### 参数
  > - optionData:object,设置项
  > ### 返回值
  > - :Promise
### post
  > ### 说明
  > - post/require,defaultOptionData = { method: 'post' }
  > ### 参数
  > - optionData:object,设置项
  > ### 返回值
  > - :Promise
### form
  > ### 说明
  > - post/require,defaultOptionData = { method: 'post', $dataType: 'formdata' }
  > ### 参数
  > - optionData:object,设置项
  > ### 返回值
  > - :Promise
### json
  > ### 说明
  > - post/require,defaultOptionData = { method: 'post', $dataType: 'formdata', $currentDataType: 'formdata' }
  > ### 参数
  > - optionData:object,设置项
  > ### 返回值
  > - :Promise
### setToken
  > ### 说明
  > - 设置token
  > ### 参数
  > - tokenName:string,token名称
  > - data:any,token值
  > - prop:string,对应的rule.prop,默认为default
  > - noSave?:boolean,是否不进行保存到local操作
  > ### 返回值
  > - :void
### getToken
  > ### 说明
  > - 获取指定token的值
  > ### 参数
  > - tokenName:string,token名称
  > - prop:string,对应的rule.prop,默认为default
  > ### 返回值
  > - tokenData:any
### clearToken
  > ### 说明
  > - 删除token
  > ### 参数
  > - tokenName:true | string,token名称
  > - prop:string,对应的rule.prop,默认为default
  > ### 返回值
  > - isClear:boolean
### destroyToken
  > ### 说明
  > - 删除token
  > ### 参数
  > - tokenName:true | string,token名称
  > - prop:string,对应的rule.prop,默认为default
  > ### 返回值
  > - isDestroy:boolean
---
[更新历史](./history.md)