const swaggerDoc = {
  openapi: '3.0.0',
  info: { title: 'BlogHub API', version: '1.0.0', description: '全功能博客平台 API' },
  servers: [{ url: '/api' }],
  paths: {
    '/auth/register': { post: { tags: ['Auth'], summary: '注册', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { '201': { description: '注册成功' } } } },
    '/auth/login': { post: { tags: ['Auth'], summary: '登录', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { '200': { description: '登录成功' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: '获取当前用户', security: [{ bearer: [] }], responses: { '200': { description: '用户信息' } } } },
    '/auth/forgot-password': { post: { tags: ['Auth'], summary: '找回密码', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, username: { type: 'string' } } } } } }, responses: { '200': { description: '重置链接已发送' } } } },
    '/posts': {
      get: { tags: ['Posts'], summary: '获取文章列表', parameters: [{ name: 'category', in: 'query' }, { name: 'search', in: 'query' }, { name: 'tag', in: 'query' }, { name: 'page', in: 'query' }, { name: 'limit', in: 'query' }], responses: { '200': { description: '文章列表' } } },
      post: { tags: ['Posts'], summary: '创建文章', security: [{ bearer: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, category: { type: 'string' } } } } } }, responses: { '201': { description: '创建成功' } } },
    },
    '/posts/{id}': {
      get: { tags: ['Posts'], summary: '获取文章详情', parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '文章详情' } } },
      put: { tags: ['Posts'], summary: '更新文章', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '更新成功' } } },
      delete: { tags: ['Posts'], summary: '删除文章', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '删除成功' } } },
    },
    '/posts/{id}/like': { post: { tags: ['Posts'], summary: '点赞/取消点赞', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '操作成功' } } } },
    '/posts/{id}/favorite': { post: { tags: ['Posts'], summary: '收藏/取消收藏', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '操作成功' } } } },
    '/posts/{id}/revisions': { get: { tags: ['Posts'], summary: '获取文章历史版本', parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '历史版本列表' } } } },
    '/posts/{id}/restore/{revId}': { post: { tags: ['Posts'], summary: '恢复历史版本', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }, { name: 'revId', in: 'path', required: true }], responses: { '200': { description: '恢复成功' } } } },
    '/comments/post/{postId}': {
      get: { tags: ['Comments'], summary: '获取文章评论', parameters: [{ name: 'postId', in: 'path', required: true }], responses: { '200': { description: '评论列表' } } },
      post: { tags: ['Comments'], summary: '发表评论', security: [{ bearer: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { content: { type: 'string' }, postId: { type: 'integer' }, parentId: { type: 'integer' } } } } } }, responses: { '201': { description: '评论成功' } } },
    },
    '/notifications': { get: { tags: ['Notifications'], summary: '获取通知列表', security: [{ bearer: [] }], responses: { '200': { description: '通知列表' } } } },
    '/notifications/read-all': { put: { tags: ['Notifications'], summary: '全部标记已读', security: [{ bearer: [] }], responses: { '200': { description: '操作成功' } } } },
    '/subscribers/subscribe': { post: { tags: ['Subscribers'], summary: '邮件订阅', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } } } } } }, responses: { '200': { description: '订阅成功' } } } },
    '/rss': { get: { tags: ['Other'], summary: 'RSS Feed', responses: { '200': { description: 'RSS XML' } } } },
    '/sitemap.txt': { get: { tags: ['Other'], summary: '站点地图', responses: { '200': { description: 'TXT sitemap' } } } },
    '/health': { get: { tags: ['Other'], summary: '健康检查', responses: { '200': { description: 'OK' } } } },
  },
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
}

export default swaggerDoc
