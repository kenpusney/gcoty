# Game Calendar — 设计与实现（gcoty）

`docs/design.md` — 集中记录本产品的「设计/实现方案」「三套主题的字体·样式·配色与思路」「深浅模式映射」。样式改动前先读这里；站点样式唯一生成点见 §1.4。

---

## 1. 设计与实现方案

### 1.1 产品
一个展示 Game Informer 情报的游戏年度发售日历。历史每年份保存，仅更新当年(2026)与未来年份。产出为**纯静态、自含、可独立访问 / 分享 URL** 的网页，无 SPA、无构建；运行时 JS 仅做增强（月份筛选、移动端日期弹层、主题切换、图表）。

### 1.2 页面
```
public/{year}.html   12 个月历：单月折叠可见，toolbar 月份链接为筛选（锚点指向月份），前/后年链接
public/index.html    年度时间轴：年份横向滚动，当年自动居中
public/stats.html    ECharts 交互统计
由 node scripts/rebuild.js 从 public/{year}.json 一键生成全部页面
```
- 数据全部内嵌 HTML，无客户端 fetch；分享任何 URL 均可用。
- 无 JS 仍可读（渐进增强，月份默认折叠、desktop 列表 / mobile 点击弹层由 JS 增补）。

### 1.3 数据管线（解析与呈现解耦）
```
index.js (scrape current+near-future) / legacy.js (2016–2018 from data/*-plain.json)
        ↓ 解析 frozen：.calendar_entry / <a> <time> <em>；正则 title(plat)-date …… 不改
   {year}.json
        ↓
scripts/dates.js     容错日期：月份缩写、June27、括号尾巴、空→tba、不可解析→invalid（不进月历/曲线）
scripts/platforms.js 平台归一化 + 家族分组（图标）；别名/家族表是唯一扩展点
scripts/aggregate.js released/upcoming/byMonth/byPlatform；date ≤ now = released
        ↓
scripts/rebuild.js  → scripts/render/{timeline,year,stats}.js + common(renderPage + STYLES)
```
- **抓取选择器绝不要动**——GameInformer 页面会漂移；宁可加归一化配置，不要改解析。
- 渲染收口 `scripts/render/*`；全站样式集中在 `scripts/render/common.js` 的 `STYLES`（会内联进每页 `<style>`）。

### 1.4 外部资源（CDN，随页面 <link>/<script> 引入）
- Google Fonts：Newsreader + Silkscreen + Pixelify Sans + Orbitron + Rajdhani（一次 link 全载）
- Bootstrap Icons 1.11.3
- ECharts 5.6.0（仅 stats.html）
> 这些是远程 CDN 引用，未 vendored；若需离线/内网要改成本地 vendor 文件。

### 1.5 统计口径
- Released = 条目年月日 ≤ 今天；Upcoming = 之后；其余（"unconfirmed"/丢失/不可解析）= **TBA**，不进入月度/年度曲线，仅计总数。
- 平台统计：每游戏各平台计一次。
- Released↔Upcoming 随构建期时间滚动（CI 每周五 + 每月 1 号：index.js → rebuild → deploy）。

---

## 2. 三套主题：字体、样式、配色与思路

主题体系由 :root(=Paper) 与 `html[data-theme="arcade|void"]` 覆盖一套**共享 token**；每主题同时驱动**配色 + 字族 + 造型**（不只换色）。选择持久化见 §3。

### 共享 token
`--fg/--muted/--line/--bg/--card/--card2`，`--accent/--accent2/--accent-soft/--accent-ink/--ring/--icon`；
语义色 `--released/--upcoming/--tba`；外壳 `--header`；阴影 `--shadow-sm/md`；
字 token `--font-display/--font-body`、标题形态 `--heading-*`；圆角 `--radius-card/pill/btn`。

> 组件颜色一律走 token，不硬编码 color；`accent` 只需在主题层重定义即可通吃换肤。

### 2.1 Paper（默认）— 报纸 / 编辑
- 字体：Newsreader（衬线）做 display 与 body。
- 造型：暖纸底、卡片轻阴影/圆角、安静编辑排版。
- 配色思路：作为中性/阅读基准，用**墨松绿主色 + 焦暖琥珀副**（非冷蓝），暖浅底 + 墨棕正文，呈纸媒印气质。
- tokens（快照）：`bg #f6f0e4 · fg #2b2118 · card #fffdf8`、`accent #1f6f54 · accent2 #9a5b13 · accent-soft #e2f0e7 · accent-ink #fff`。

### 2.2 Arcade — 街机电玩 / 复古竞赛
- 字体：**Silkscreen**（display 像素）+ **Pixelify Sans**（body）；标题 uppercase、窄字距像素语气。
- 造型：方角（radius 2px）、卡片**错位硬阴影**像素感、空日格点阵底、配色高饱和。
- 配色思路：与 Paper 色相拉开——**明靛蓝主 + 高品红副**；品红只做装饰/大字，不做小字链接（对浅底 ~4.3:1 偏弱）。
- tokens（约）：`bg` 近白稍蓝晕；`accent #3b5bdb · accent2 #db2777 · accent-soft #e2e8ff`。

### 2.3 Void — 夜店 / 赛博朋克（唯一**暗**主题）
- 字体：**Orbitron**（display 未来感）+ **Rajdhani**（body 无衬线）；标题 uppercase + 宽字距。
- 造型：深紫→靛 radial 霓虹底；卡片改为**实深靛**分层；标题霓虹辉光；扫描线以 `body::before` 覆盖；today/active 青描边辉光。
- 配色思路：收敛单一主霓虹（洋红紫 `#e879f9`），青 `#22d3ee` 只担辉光/描边；实卡 + 提亮 contour 线保证层次/可读。
- 移动端日期弹层在此主题用近不透明面板 + 列表字重/字号拉高，补偿 Rajdhani 偏细。

> 完整精确值以 `scripts/render/common.js::STYLES` 内 `:root` 与各 `html[data-theme]` 为准；上面是设计思路 + 快照。

### 2.4 色彩理论要点（据此做过一轮重调）
- 本轮曾存在"三套都在高蓝(220°–290°)"的色相堆叠问题 → 已拉开：Paper=绿/琥珀(暖)、Arcade=靛/品红、Void=洋红/青。
- 对比度（正文关键层）经算均过 AA / 多 AAA：paper accent/bg≈5.3、amber≈4.8、arcade accent≈5.3、void fg/card≈13、accent(pink)/card≈6、accent-ink↔pink≈7.5。
- 语义色跨主题稳定（released 绿、upcoming 琥珀类），图例看懂。
- 规则：accent2 等装饰色不为小正文；Void 深浅下「一实一辉」；改色以对比 ≥4.5:1（正文）为门槛。

---

## 3. 深浅模式映射（System ↔ Light/Dark）

入口：header 右上主题钮（`switcher`）；移动端仍右上（brand+按钮一行、nav 下一行）。顺序循环 **Paper → Arcade → Void → Auto → Paper …**（`T` 键）。

| 用户选择 | 结果 | 说明 |
|---|---|---|
| Auto（跟随系统） | `prefers-color-scheme: dark` → **Void**；`light` → **Paper** | auto 时监听系统切换实时跟随 |
| Paper | 浅 | — |
| Arcade | 浅 | — |
| Void | 深 | 唯一暗外观（不想要 Auto 时手动直达） |

- 键：`localStorage['gc-theme']` ∈ `{paper, arcade, void, auto}`；缺失/旧值视作 **auto**。
- 规则：首次（无记录）即按 Auto（=跟随系统深浅）；一旦手选具体主题则锁定，系统变化不再自动跳，除非切回 Auto。
- 首帧不闪：`<head>` 内置同 resolve（Auto 按 system 决定 theme）。
- 编码约定：`data-theme` 只有 `arcade`/`void` 两值；Paper 即默认（不写 data-theme 属性）。
