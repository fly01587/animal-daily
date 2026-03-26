# Pixi Survivor

这个目录是一个独立的 PixiJS 小游戏工程（Vite + TypeScript）。

## 快速开始

在项目根目录执行：

```bash
pnpm --dir pixi-game install --ignore-workspace
pnpm --dir pixi-game dev
```

启动后访问终端提示的地址（默认 http://localhost:5176）。

## 当前玩法（MVP）

- `W/A/S/D` 移动
- 角色自动朝最近敌人射击
- 敌人会持续从边缘刷新并追踪玩家
- 子弹命中造成伤害，击杀会累计 `Kills` 并掉落经验球
- 敌人贴身会持续扣血
- 吸收经验后会升级，弹出三选一强化（按 `1/2/3` 选择）
- 死亡后按 `R` 重开

## 目录

- `src/main.ts`：核心逻辑（渲染、输入、刷新、碰撞、重开）
- `index.html`：页面容器与基础样式
- `vite.config.ts`：开发端口配置（5176）
