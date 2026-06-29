<script setup lang="ts">
import {
  ALL_MERMAID_SHAPES,
  MERMAID_SHAPE_LABELS,
  MERMAID_SHAPE_SYNTAX,
  mermaidShapeClass,
} from '@/lib/mermaidShapes'
import { flowNodeClass } from '@/lib/partPhase'

const samples = [
  { phase: 'step' as const, label: '推理开始', usage: '步骤 / 起止' },
  { phase: 'think' as const, label: '思考中', usage: '思考' },
  { phase: 'tool' as const, label: '调用 read', usage: '调用（当前）' },
  { phase: 'output' as const, label: '文字输出', usage: '输出' },
  { phase: 'file' as const, label: '变更 · 3 个文件', usage: '变更（当前）' },
  { phase: 'delegate' as const, label: '子任务', usage: '委派' },
  { phase: 'system' as const, label: '上下文压缩', usage: '系统' },
]

const currentMapping = [
  { msg: '调用（tool）', shape: 'subroutine', syntax: '[[text]]', note: '子流程 — 双边框' },
  { msg: '变更（patch）', shape: 'rounded', syntax: '(text)', note: '圆角矩形' },
  { msg: '推理轮次', shape: '（方框分组）', syntax: '(text)', note: '灰色虚线方框包裹，取消开始/结束节点' },
  { msg: '推理开始/完成', shape: 'stadium', syntax: '([text])', note: '已取消单独节点' },
  { msg: '思考', shape: 'rounded', syntax: '(text)', note: '圆角矩形' },
  { msg: '输出', shape: 'parallelogram', syntax: '[/text/]', note: '平行四边形' },
  { msg: '快照', shape: 'cylinder', syntax: '[(text)]', note: '圆柱' },
  { msg: '附件', shape: 'asymmetric', syntax: '>text]', note: '旗形' },
]
</script>

<template>
  <div class="gallery">
    <header class="gallery-header">
      <h1>Mermaid 流程节点外形</h1>
      <p>共 {{ ALL_MERMAID_SHAPES.length }} 种，与 Mermaid flowchart 语法一一对应。下方色块为流程图实际渲染效果。</p>
      <a class="back-link" href="/">← 返回聊天</a>
    </header>

    <section class="gallery-section">
      <h2>当前消息映射</h2>
      <div class="mapping-grid">
        <div v-for="row in currentMapping" :key="row.msg" class="mapping-row">
          <span class="mapping-msg">{{ row.msg }}</span>
          <code class="mapping-syntax">{{ row.syntax }}</code>
          <span class="mapping-note">{{ row.note }}</span>
        </div>
      </div>
    </section>

    <section class="gallery-section">
      <h2>全部外形一览</h2>
      <div class="shape-grid">
        <article v-for="shape in ALL_MERMAID_SHAPES" :key="shape" class="shape-card">
          <div class="shape-preview">
            <div
              class="flow-node phase-tool"
              :class="mermaidShapeClass(shape)"
            >
              <span v-if="shape === 'stadium' || shape === 'rhombus' || shape === 'circle' || shape === 'hexagon'" class="flow-node-compact">
                <span class="compact-line">{{ MERMAID_SHAPE_LABELS[shape].slice(0, 2) }}</span>
                <span class="compact-line">示例</span>
              </span>
              <span v-else class="flow-node-inner">
                <span class="flow-node-text">{{ MERMAID_SHAPE_LABELS[shape] }}</span>
              </span>
            </div>
          </div>
          <h3>{{ MERMAID_SHAPE_LABELS[shape] }}</h3>
          <code class="shape-syntax">{{ MERMAID_SHAPE_SYNTAX[shape] }}</code>
          <span class="shape-id">.shape-{{ shape }}</span>
        </article>
      </div>
    </section>

    <section class="gallery-section">
      <h2>各阶段配色示例</h2>
      <div class="phase-grid">
        <div v-for="sample in samples" :key="sample.phase" class="phase-card">
          <div
            class="flow-node"
            :class="[
              `phase-${sample.phase}`,
              flowNodeClass(sample.phase),
              sample.phase === 'tool' ? mermaidShapeClass('subroutine') : '',
              sample.phase === 'file' ? mermaidShapeClass('rounded') : '',
              sample.phase === 'step' ? mermaidShapeClass('stadium') : '',
              sample.phase === 'think' ? mermaidShapeClass('rounded') : '',
              sample.phase === 'output' ? mermaidShapeClass('parallelogram') : '',
              sample.phase === 'delegate' ? mermaidShapeClass('subroutine') : '',
              sample.phase === 'system' ? mermaidShapeClass('rounded') : '',
            ]"
          >
            <span
              v-if="sample.phase === 'step'"
              class="flow-node-compact"
            >
              <span class="compact-line">推理</span>
              <span class="compact-line">开始</span>
            </span>
            <span v-else class="flow-node-inner">
              <span class="flow-node-text">{{ sample.label }}</span>
            </span>
          </div>
          <span class="phase-usage">{{ sample.usage }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
html,
body,
#shapes-app {
  height: auto;
  min-height: 100%;
  overflow: auto;
}
</style>

<style scoped>
.gallery {
  min-height: 100vh;
  overflow: auto;
  padding: 24px 32px 48px;
  background: var(--bg);
  color: var(--text);
}

.gallery-header h1 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}

.gallery-header p {
  color: var(--text-2);
  font-size: 14px;
  max-width: 720px;
}

.back-link {
  display: inline-block;
  margin-top: 12px;
  color: var(--accent);
  text-decoration: none;
  font-size: 13px;
}

.back-link:hover {
  text-decoration: underline;
}

.gallery-section {
  margin-top: 32px;
}

.gallery-section h2 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
  color: var(--text);
}

.mapping-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 720px;
}

.mapping-row {
  display: grid;
  grid-template-columns: 140px 100px 1fr;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.mapping-msg {
  font-weight: 600;
}

.mapping-syntax {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
}

.mapping-note {
  color: var(--text-2);
}

.shape-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 16px;
}

.shape-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.shape-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  width: 100%;
}

.shape-card h3 {
  font-size: 13px;
  font-weight: 600;
}

.shape-syntax {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--accent);
}

.shape-id {
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--font-mono);
}

.phase-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-end;
}

.phase-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.phase-usage {
  font-size: 11px;
  color: var(--text-2);
}

/* 复用流程图节点样式 */
.flow-node {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 152px;
  min-height: 28px;
  padding: 6px 10px;
  border: 2px solid var(--border);
  color: var(--text);
  overflow: hidden;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  position: relative;
}

.flow-node-inner {
  display: block;
  width: 100%;
}

.flow-node-text {
  display: block;
  line-height: 1.45;
  word-break: break-word;
  text-align: center;
  width: 100%;
}

.flow-node-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  line-height: 1.12;
  width: 100%;
  position: relative;
  z-index: 1;
}

.compact-line {
  display: block;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.02em;
}
</style>
