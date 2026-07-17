# 无人机扫描任务闭环管理系统

电力线路无人机巡检后的扫描任务闭环管理网页（本地原型，V2.2）。支持 **复扫任务 / 通扫任务** 两种任务类型。

核心流程：发现问题 → 建立扫描任务（复扫 / 通扫）→ 派发责任人 → 现场扫描 → 填写结果 → （需再次扫描）→ 确认闭环 → 导出台账

## 功能特性（V2.2）

- 任务类型：新建 / 编辑时可选「复扫任务」或「通扫任务」，旧数据自动迁移为复扫
- 扫描任务列表按「计划扫描日期」所在周分组（周一起始），分 全部 / 复扫 / 通扫 三个子页面
- 状态流五态：待复扫 → 已派发 → 已完成 → 需再次扫描 → 已闭环
- 每条记录统计「扫描次数」（每次进入“已完成”自动 +1）
- Excel 双导出：「本周周报」（本周任务精简 8 列 + 美化样式，直接发工作群）+「全部台账备份」（15 列全字段，工作表「扫描任务台账」），导入兼容旧版 13 列与新版 15 列文件

## 技术栈

- React 18 + Vite 5
- Tailwind CSS（深色科技风 + 液态玻璃）
- react-router-dom 路由（HashRouter）
- localStorage 本地存储（第一版数据存在本机浏览器）
- exceljs 导出 / 导入 Excel 台账
- UI 特效：FloatingLines（背景流动线条，three.js）、MagicBento（发光卡片，gsap）、Spline（工作台 3D 机器人）

## 运行

```bash
npm install
npm run dev        # 本地开发，默认 http://localhost:5173
npm run build      # 打包到 dist/
npm run preview    # 预览打包结果
```

## 页面

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | 工作台 | 7 张统计卡片（总数 + 五状态 + 逾期）+ 最近任务 |
| `/tasks` | 全部任务 | 主台账：按周分组、筛选、搜索、改状态、编辑、删除（含“类型”列） |
| `/tasks/rescan` | 复扫任务 | 仅复扫类型任务 |
| `/tasks/general` | 通扫任务 | 仅通扫类型任务 |
| `/tasks/new` | 新建任务 | 录入任务（可选任务类型），编号自动生成 FS-年月日-序号 |
| `/tasks/:id/edit` | 编辑任务 | 修改任务 |
| `/tasks/:id` | 任务详情 | 状态流转、扫描结果、闭环结论 |
| `/export` | 数据导出 | 本周周报 / 全部台账备份 双导出 + 导入台账 |

## 说明

- 第一版数据保存在本机浏览器 localStorage（key：`drone_rescan_tasks_v1`），换电脑/浏览器或清除数据后将看不到任务；旧版数据打开后自动迁移，无需手工处理。
- 首次打开会自动写入 5 条示例数据（覆盖待复扫/已派发/已完成/已闭环及逾期）。
- 「数据导出」页底部可“恢复内置示例数据”。
- 如需多人共享同一份数据，后续可接入数据库（Supabase / 腾讯云 CloudBase 等），替换 `src/lib/storage.js` 的实现即可。

## 目录

```
src/
  components/   Layout、FloatingLines、GlowCard(MagicBento)、StatusBadge
  pages/        Dashboard、TaskList、TaskForm、TaskDetail、DataExport
  lib/          constants、storage、sampleData、exportExcel、importExcel
```
