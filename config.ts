
const config = {
  Require: {
    devShowRule: true,
    failMsg: '服务器请求失败，请刷新重试或联系管理员！',
    formContentType: 'multipart/form-data'
  },
  RequireRule: {
    // defaultTokenName: 'default'
  },
  TokenRule: {
    location: 'body'
  }
}

export default config
