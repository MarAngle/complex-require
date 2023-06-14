
const config = {
  require: {
    showRule: true,
    fail: {
      require: '请求失败，请刷新重试或联系管理员！',
      server: '服务器请求失败，请刷新重试或联系管理员！'
    },
    status: {
      403: '拒绝访问！',
      404: '很抱歉，资源未找到！',
      405: '请求方法不支持！',
      504: '网络超时！'
    }
  },
  instance: {
    formContentType: 'multipart/form-data',
  }
}

export default config
