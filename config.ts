
const config = {
  Require: {
    devShowRule: true,
    formContentType: 'multipart/form-data',
    fail: {
      require: '请求失败，请刷新重试或联系管理员！',
      server: '服务器请求失败，请刷新重试或联系管理员！'
    }
  }
}

export default config
