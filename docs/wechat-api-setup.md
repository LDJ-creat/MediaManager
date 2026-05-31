# 微信公众号 API 配置

MediaManager 使用**两套独立凭证**访问微信公众号：

| 用途 | 存储位置 | 配置方式 |
|------|----------|----------|
| 运营数据抓取（阅读、粉丝等） | `{workspace}/.media-manager/auth/wechat/` | `media setup` 浏览器登录，或 `media wechat auth export` |
| 草稿箱 API 发布 | `{workspace}/.media-manager/secrets/wechat-api.env` | `media setup` 或 `media wechat config api` |

本文说明 **API 发布** 所需的 AppID / AppSecret。

## 快速配置

```bash
media setup                  # 交互向导（推荐）
# 或
media wechat config api      # 仅更新 API 密钥
media wechat check-env       # 验证
```

## 获取 AppID 与 AppSecret

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入 **开发 → 基本配置**
3. 复制 **AppID** 与 **AppSecret**

详细说明与接口规范见官方文档：[微信公众平台开发者接入指南](https://developers.weixin.qq.com/doc/subscription/guide/dev/api/)

## IP 白名单

若公众号后台开启了 **IP 白名单**，调用 API 的机器公网 IP 必须加入白名单，否则获取 `access_token` 会失败。

1. 在公众号后台 **开发 → 基本配置 → IP 白名单** 中添加本机公网 IP
2. 可通过 `curl ifconfig.me` 等方式查看当前公网 IP
3. `media setup` 保存凭证后会尝试验证；若失败会提示 IP 白名单相关错误

## 环境变量（高级）

`wechat-api.env` 内容示例：

```env
WECHAT_APP_ID=wxXXXXXXXX
WECHAT_APP_SECRET=your_app_secret
```

加载优先级（高 → 低）：

1. 进程环境变量
2. `{workspace}/.media-manager/secrets/wechat-api.env`
3. skill 包内 `.env`（不推荐，npm 升级可能丢失）

## 故障排查

| 现象 | 处理 |
|------|------|
| `Missing WECHAT_APP_ID` | 运行 `media wechat config api` |
| IP 白名单错误 (40164) | 在公众号后台添加本机公网 IP |
| AppSecret 无效 (40013 等) | 核对 AppID/AppSecret，必要时重置 Secret |
| 能抓数据但不能发草稿 | 检查是否只配置了浏览器 auth，未配置 API secrets |
