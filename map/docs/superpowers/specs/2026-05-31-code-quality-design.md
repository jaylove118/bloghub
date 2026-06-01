# BlogHub 代码质量提升设计

## 范围

保守策略——只做零风险或极低风险的改动，不拆组件、不提 Hook、不动逻辑链路。
74 个现有测试必须全绿。

## 改动清单

### 1. 调试代码清理（零风险）

删除 8 个文件中的 `console.log/warn/error`：

**前端 (5):**
- `src/pages/Editor.jsx`
- `src/pages/BlogDetail.jsx`  
- `src/pages/Settings.jsx`
- `src/components/ErrorBoundary.jsx`
- `src/__tests__/markdown-parser.test.ts`（测试文件，可保留）

**后端 (3):**
- `server/src/index.js`
- `server/src/utils/email.js`
- `server/src/config/init.js`

规则：保留 `console.error` 在 ErrorBoundary 中（运行时错误需要输出），其余全删。

### 2. Swagger 文档抽离（极低风险）

- 新建 `server/src/config/swagger.js`，导出 `swaggerDoc` 对象
- `server/src/index.js` 改为 `import swaggerDoc from './config/swagger.js'`
- 纯数据移动，不改变任何逻辑

### 3. 错误处理统一（低风险）

- 新建 `src/utils/errors.js`，导出 `handleError(error, setError)` 和 `showError(error)` 两个工具函数
- 逐个替换页面中的不一致模式：
  - `catch {}` → `catch (err) { handleError(err, setError) }`
  - `catch { alert('xxx') }` → `catch (err) { showError(err) }`
  - `catch (error) { setError(error.message) }` → `catch (err) { handleError(err, setError) }`

### 不做

- 大文件拆分（Editor/BlogDetail/api.js）
- 自定义 Hook 提取
- 组件拆分（Navbar/CommentSection）
- 后端路由文件拆分
