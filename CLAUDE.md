# 地势琨（训练记）

自用健身网页 App：三种固定模板记组数（每组颜色不同、顶部常驻「刚记」防忘），每天记体重 / 热量 / 起床静息心率。只在 iPhone 主屏幕上用，数据存手机（IndexedDB），不上云。和减肥 App（../jianfei，要上云给爸妈用）分开做，不方便再考虑合并。

- 线上：https://jasper251k.github.io/jianshen/ （仓库 jasper251k/jianshen，公开）
- 用户不写代码，按量付费：回复用中文、简短、少术语；大改动先说规模再做；给网址单独一行。

## 新对话先看什么

1. 本文件。
2. 需要背景时，只读 [PLAN.md](PLAN.md) 的「进度」最后几条。
3. 再按需检索 `app/src`。

## 改代码的流程

1. 改 `app/src`。
2. 检查：`cd app && npx tsc -b`。
3. 发布：在本文件夹运行 `./deploy.sh`，约 1 分钟后手机关掉 App 再打开即更新。
4. 收尾在 PLAN.md「进度」追加一两行，提交并推送。

改数据结构要升级 Dexie 版本（`src/db.ts`），不能丢手机里的旧数据。

## 代码地图

| 文件 | 作用 |
|---|---|
| `src/db.ts` | 数据表（templates 模板、workouts 训练、daily 每日数据、plan 周计划截图）、默认三个模板、开始/结束训练 |
| `src/util.ts` | 日期、数字格式、每组颜色 `SET_COLORS` |
| `src/hooks.ts` | 每秒刷新、屏幕常亮、有氧到点响铃 |
| `src/backup.ts` | 导出 / 恢复 JSON 备份 |
| `src/pages/Today.tsx` | 首页：每日三格 + 本周计划 + 选模板开练 |
| `src/components/Plan.tsx` | 周计划截图：首页卡片、上传 / 换一张、全屏双指放大看 |
| `src/pages/WorkoutView.tsx` | 训练中：顶部「刚记」、每个动作卡、结束 |
| `src/components/ExerciseCard.tsx` | 一个动作：彩色圆点、下一组重量次数、有氧计时 |
| `src/components/SetSheet.tsx` | 点已做的组：改 / 删 |
| `src/pages/History.tsx` | 按日期翻看、补记每日数据、删训练 |
| `src/pages/Settings.tsx` | 编辑模板、备份、恢复默认模板 |
| `scripts/icons.mjs` | 生成主屏幕图标（`npm run icons`） |
