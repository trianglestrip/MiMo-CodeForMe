BcAI 绿色版 (distWebServer)
================================

目录结构
  start.bat            一键启动（API + Web）
  stop.bat             停止 4096 / 8000
  server/
    mimo.exe           MiMo API 二进制（约 140MB，随绿色版一并提供）
    mimo-config.json   模型与 provider 配置
    mimo-auth.json     鉴权配置（启动时写入 .dev-home；可复制 mimo-auth.json.example）
    mimo-auth.json.example  鉴权模板（含 mimo-free 与 DeepSeek 占位，勿提交真实 key）
    run-mimo.bat       启动 mimo serve（由 start.bat 调用）
  web/                 前端静态文件 + Web 服务
    start-web.bat      启动 Web(8000)，由 start.bat 调用
    web-server.mjs     静态服务 + /mimo 代理

  首次 start.bat 会自动创建 work/ 作为默认工作目录

本机构建（仅编译并复制 web/，不更新 server/mimo.exe）
  web\build-dist-web-server.bat

启动 / 停止
  start.bat
  start.bat D:\your\project
  stop.bat

.bat 文件为 GBK（无 BOM）+ CRLF 换行；规范见 .cursor/rules/batch-scripts.mdc

拷贝到其他电脑
  复制整个 distWebServer 文件夹即可。

目标电脑依赖
  - Node.js 18+（仅用于 Web 静态服务）
  - 无需全局安装 mimo / npm

访问地址
  Web:   http://127.0.0.1:8000/
  Trace: http://127.0.0.1:8000/trace.html
  API:   http://127.0.0.1:4096/（本机免登录）

模型（后端 mimo-config.json + 前端右上角下拉）
  免费：MiMo Auto（mimo/mimo-auto）
  官方：DeepSeek V4 Flash、DeepSeek V4 Pro（需在 mimo-auth.json 填写 DeepSeek API Key）
  修改 mimo-auth.json 后重启 start.bat；前端切换模型会随 prompt 传给 API
