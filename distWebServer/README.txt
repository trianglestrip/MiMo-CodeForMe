MiMoCode 绿色版 (distWebServer)
================================

目录结构
  start.bat            一键启动（API + Web）
  stop.bat             停止 4096 / 5173
  web-server.mjs       Node 静态服务 + /mimo 代理
  server/
    mimo.exe           MiMo API 二进制（构建时下载，约 140MB）
    mimo-config.json   模型与 provider 配置
    mimo-auth.json     鉴权配置（启动时写入 .dev-home）
    start-serve.bat    启动 mimo serve
  web/                 前端生产构建（构建时生成）

  首次 start.bat 会自动创建 work/ 作为默认工作目录

本机构建
  script\build-dist-web-server.bat

启动 / 停止
  start.bat
  start.bat D:\your\project
  stop.bat

拷贝到其他电脑
  复制整个 distWebServer 文件夹即可。

目标电脑依赖
  - Node.js 18+（仅用于 Web 静态服务）
  - 无需全局安装 mimo / npm

访问地址
  Web:   http://127.0.0.1:5173/
  Trace: http://127.0.0.1:5173/trace.html
  API:   http://127.0.0.1:4096/（本机免登录）
