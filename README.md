# flomo-web-cli

中文 | [English](README.en.md)

`flomo-web-cli` 是一个本地运行的第三方 flomo 命令行工具。它使用你自己的 flomo Web 登录态凭据，支持列出、搜索、同步、查看和新建 memo。

> 本项目不是 flomo 官方项目。它依赖 flomo Web 的内部接口和会话凭据，接口可能变化；请只在你信任的本地环境中运行。

## 风险声明

使用本项目即表示你理解并接受以下风险：

- 本项目由社区开发者维护，不代表 flomo 官方，也不获得 flomo 官方背书或服务承诺。
- 本项目按“现状”提供，不保证持续可用、接口稳定、数据完整性或适配所有使用场景。
- 你需要自行确认使用方式符合 flomo 服务条款、所在地区法律法规和所在组织的安全要求。
- 你自行承担因使用本项目产生的账号异常、凭据泄露、数据丢失、请求失败、服务中断或第三方限制等风险。
- 在适用法律允许的最大范围内，项目开发者和贡献者不对上述风险造成的直接或间接损失承担责任。

## 功能

- 使用 flomo Web 会话凭据访问 memo，不需要 flomo Pro。
- 支持最近 memo 列表、关键词搜索、按 `slug` 查看、创建 memo。
- 支持 `sync` 将 memo 写入本地持久缓存，后续可用 `--scope all` 做全量缓存搜索或定位。
- 默认输出适合人工阅读；加 `--json` 可用于脚本自动化。
- 支持用户配置文件、`.env`、环境变量和单次命令参数。

## 相关项目

- [flomo-web-mcp](https://github.com/godisabug/flomo-web-mcp)：同一 flomo Web 访问逻辑的 MCP stdio server，适合接入支持 Model Context Protocol 的客户端。
- `flomo-web-cli`：当前项目，适合在终端或脚本里直接操作 flomo memo。

## 要求

- Node.js 20.19.0 或更高版本。
- npm。
- 你自己的 flomo Web `Authorization` header。

## 安装

### 通过 GitHub 安装

```bash
npm install -g github:godisabug/flomo-web-cli
```

安装后命令为：

```bash
flomo-web --help
```

### 克隆仓库部署

本仓库只保留用户部署需要的运行文件，不包含开发源码和测试。

```bash
git clone https://github.com/godisabug/flomo-web-cli.git
cd flomo-web-cli
npm install --omit=dev
node dist/index.js --help
```

如需在本机注册全局命令：

```bash
npm link
flomo-web --help
```

### npm 发布后

```bash
npm install -g flomo-web-cli
```

全局命令为：

```bash
flomo-web
```

## 配置

可以使用环境变量、`.env` 或用户配置文件。环境变量和 `.env` 会覆盖用户配置。

```bash
flomo-web config set authorization "Bearer your-token-here"
flomo-web config set timezone Asia/Shanghai
```

显示配置时，`authorization` 和 `cookie` 等敏感值会被遮蔽：

```bash
flomo-web config list
flomo-web config get authorization
```

也可以使用 `.env`：

```dotenv
FLOMO_AUTHORIZATION=Bearer your-token-here
FLOMO_COOKIE=
FLOMO_USER_AGENT=Mozilla/5.0
FLOMO_BASE_URL=https://flomoapp.com
FLOMO_WEB_BASE_URL=https://v.flomoapp.com
FLOMO_TIMEZONE=Asia/Shanghai
```

默认用户配置路径：

```text
Windows: %APPDATA%\flomo-web-cli\config.json
macOS: ~/Library/Application Support/flomo-web-cli/config.json
Linux: ${XDG_CONFIG_HOME:-~/.config}/flomo-web-cli/config.json
```

## 命令

数据命令都支持 `--authorization <value>`，用于覆盖本次调用的已配置凭据。

```bash
flomo-web list --limit 20
flomo-web list --authorization "Bearer your-token-here"
flomo-web list --json
```

```bash
flomo-web search "keyword" --limit 20
flomo-web search "keyword" --scope all
flomo-web search "keyword" --json
```

```bash
flomo-web sync --page-size 200 --max-pages 50
flomo-web sync --json
```

```bash
flomo-web get memo-slug
flomo-web get memo-slug --scope all
flomo-web get memo-slug --json
```

```bash
flomo-web create "memo content #tag"
echo "memo content" | flomo-web create --stdin
flomo-web create "memo content" --tag work --tag daily
flomo-web create "memo content" --json
```

```bash
flomo-web config set authorization "Bearer your-token-here"
flomo-web config get authorization
flomo-web config unset cookie
flomo-web config list
```

## JSON 输出

数据命令支持 `--json`。JSON 输出写入 stdout；错误写入 stderr：

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "..."
  }
}
```

## 缓存

`flomo-web sync` 会写入本地持久缓存，之后 `search --scope all` 和 `get --scope all` 可以从缓存中查询。

默认缓存路径：

```text
Windows: %LOCALAPPDATA%\flomo-web-cli\cache\notes.json
macOS: ~/Library/Caches/flomo-web-cli/notes.json
Linux: ${XDG_CACHE_HOME:-~/.cache}/flomo-web-cli/notes.json
```

缓存包含 memo 正文。不要上传、分享或提交缓存文件。

## 获取 Authorization

1. 浏览器登录 flomo Web。
2. 打开 DevTools 的 Network。
3. 刷新页面。
4. 找到 flomo 的 XHR/fetch 请求。
5. 从 Request Headers 复制 `Authorization: Bearer ...`。
6. 用 `flomo-web config set authorization "Bearer ..."` 或 `FLOMO_AUTHORIZATION` 保存。

## 安全提醒

- 不要提交 `.env`、真实凭据或缓存文件。
- 不要把凭据粘贴到公开 issue、在线调试工具或第三方服务。
- CLI 会在配置展示命令中遮蔽 `authorization` 和 `cookie`，但这不能替代你对本地文件和终端历史的主动保护。
- flomo Web 内部接口可能随时变化。

## 许可证

MIT，见 [LICENSE](LICENSE)。
