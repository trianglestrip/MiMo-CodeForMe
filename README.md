# MiMoCode (Fork)

基于 [OpenCode](https://github.com/anomalyco/opencode) 的定制版本。

## 相对原版的改动

- **Web UI** — 新增 Vue 前端（`web/` 目录），支持浏览器聊天界面
- **Windows 启动脚本** — `script/start-mimo-serve.bat` 和 `script/start-mimo-web.bat`
- **CORS IPv6 支持** — 白名单增加 `http://[::1]:` 本地回环地址
- **MiMo Provider 集成** — 内置 MiMo Auto 免费模型通道

## 构建

### 前置依赖

- [Bun](https://bun.sh) — 编译 `mimo.exe`（serve 二进制）
- Node.js 18+ — 构建 Web 前端

### 编译 serve 二进制（mimo.exe）

Windows 一键构建（仅当前平台，推荐）：

```bat
script\build-mimo-serve.bat
```

等价命令：

```bat
bun install
cd packages\opencode
bun run build -- --single
```

产物路径：

```
packages\opencode\dist\mimocode-windows-x64\bin\mimo.exe
```

验证：

```bat
packages\opencode\dist\mimocode-windows-x64\bin\mimo.exe serve --hostname 127.0.0.1 --port 4096
```

### 构建绿色版 Web 前端（distWebServer）

仅更新 `distWebServer\web\`，**不会**更新 `server\mimo.exe`：

```bat
web\build-dist-web-server.bat
```

### 更新绿色版完整包

1. 编译 serve：`script\build-mimo-serve.bat`
2. 复制二进制到绿色版目录：
   ```bat
   copy /Y packages\opencode\dist\mimocode-windows-x64\bin\mimo.exe distWebServer\server\mimo.exe
   ```
3. 构建 Web 前端：`web\build-dist-web-server.bat`
4. 启动验证：`distWebServer\start.bat`

更多绿色版细节见 `distWebServer\README.txt`。

## 启动服务

### 方式一：Web 界面（推荐）

```bash
# Windows
script\start-mimo-web.bat

# 或指定工作目录
script\start-mimo-web.bat D:\your\project
```

启动后自动打开浏览器：
- 聊天界面：`http://127.0.0.1:7000/`
- Trace 面板：`http://127.0.0.1:7000/trace.html`

### 方式二：绿色版（便携）

```bash
distWebServer\start.bat
```

- Web：`http://127.0.0.1:8000/`
- API：`http://127.0.0.1:4096/`

### 方式三：仅 API 服务

```bash
# Windows
script\start-mimo-serve.bat
```

服务地址：`http://127.0.0.1:9000`
用户名：`mimocode` | 密码：`mimocode-standalone`

### 方式四：开发模式

```bash
bun install
bun run dev          # TUI 开发
bun run dev:web      # Web 开发
```

## 依赖

- [MiMo CLI](https://mimo.xiaomi.com) — `npm install -g @mimo-ai/cli @mimo-ai/mimocode-windows-x64`（方式一/三需全局安装；绿色版无需）
- [Bun](https://bun.sh) — 从源码编译 `mimo.exe`
- Node.js 18+ — Web 前端构建与绿色版 Web 静态服务
