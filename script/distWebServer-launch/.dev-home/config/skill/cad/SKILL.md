---
name: cad
description: Use when the user asks to draw, modify, query, or analyze CAD entities in BCPD_AI (ZWCAD). This skill teaches how to call the CAD service HTTP API via the cad_* tools.
---

# CAD 服务操作指南 (BCPD_AI)

## 概述

BCPD_AI 是运行在 ZWCAD 中的 AI 辅助插件，通过 HTTP API 暴露 CAD 操作。你可以通过 `cad_call`、`cad_batch`、`cad_capabilities`、`cad_status` 四个工具与之交互。

**服务地址：** `http://127.0.0.1:9810`

## 可用工具

| 工具 | 用途 |
|------|------|
| `cad_capabilities` | 发现所有可用命令及其参数 Schema |
| `cad_call` | 执行单个 CAD 命令 |
| `cad_batch` | 批量执行多个命令（顺序执行） |
| `cad_status` | 检查服务运行状态 |

## 使用流程

### 1. 首先检查服务是否可用

```
cad_status({})
```

如果返回 `"server": "running"`，说明 CAD 服务已就绪。

### 2. 查询可用命令

```
cad_capabilities({})
```

返回所有注册命令列表，包含参数 Schema。可通过 `category` 过滤：

```
cad_capabilities({ category: "draw" })
```

### 3. 执行命令

单个命令：

```
cad_call({ method: "draw_line", params: { x1: 0, y1: 0, z1: 0, x2: 100, y2: 100, z2: 0 } })
```

批量命令（画矩形）：

```
cad_batch({ commands: [
  { id: "bottom", method: "draw_line", params: { x1: 0, y1: 0, x2: 100, y2: 0 } },
  { id: "right",  method: "draw_line", params: { x1: 100, y1: 0, x2: 100, y2: 50 } },
  { id: "top",    method: "draw_line", params: { x1: 100, y1: 50, x2: 0, y2: 50 } },
  { id: "left",   method: "draw_line", params: { x1: 0, y1: 50, x2: 0, y2: 0 } }
] })
```

## 响应格式

### 成功响应

```json
{
  "type": "result",
  "id": "http-draw_line",
  "payload": {
    "handle": "1A3",
    "entity": "AcDbLine"
  }
}
```

### 错误响应

```json
{
  "type": "error",
  "id": "http-draw_line",
  "payload": {
    "code": -2,
    "message": "Unknown method: foo",
    "retryable": false
  }
}
```

### 错误码

| code | 含义 |
|------|------|
| -1 | 无效 JSON |
| -2 | 未知方法 |
| -3 | 执行异常 |
| -4 | 主线程超时 |
| -5 | 队列被清空 |

## 常见命令类别

| 类别 | 示例方法 |
|------|----------|
| draw | `draw_line`, `draw_circle`, `draw_rect`, `draw_arc`, `draw_polyline` |
| modify | `move_entity`, `copy_entity`, `erase_entity`, `rotate_entity`, `scale_entity` |
| query | `get_selection`, `get_entity_info`, `get_layers`, `get_blocks` |
| file | `get_file_info`, `open_file`, `save_file` |

> **重要：** 以上仅为示例。实际可用命令由 `cad_capabilities` 返回。每次操作前先查询最新命令列表。

## 最佳实践

1. **先发现再执行**：不确定有什么命令时，先调 `cad_capabilities` 查看。
2. **使用 batch 提高效率**：多步绘图操作用 `cad_batch` 一次提交。
3. **保留 handle**：创建实体后保存返回的 `handle`，后续修改/查询需要它。
4. **处理错误**：检查响应中的 `type` 字段，`"error"` 时读取 `payload.message`。
5. **只读操作更快**：查询类命令（`is_readonly: true`）不需排队，立即返回。
