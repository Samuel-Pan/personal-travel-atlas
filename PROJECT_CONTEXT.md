# Personal Travel Atlas 项目交接文档

这份文档面向后续接手本项目的 AI、开发者和产品协作者。开始修改代码前，请先阅读本文，再结合当前磁盘上的源码确认实现细节。

## 1. 项目定位

Personal Travel Atlas 是一个个人中国旅行足迹数字地图，不是普通后台或相册。视觉方向是“实体旅行记忆墙 + 纸张档案 + 数字地图”：米白纸张、照片卡片、地图节点、纸夹、档案票据和轻量动画。

当前范围是中国旅行档案，地图覆盖大陆、港澳台。未来可以在数据模型中增加 `Country` 层级扩展世界地图，但不要为了未来扩展重写当前 `Province -> City -> TravelRecord -> Photo` 关系。

## 2. 技术栈和运行方式

- Next.js 16.3 App Router + TypeScript
- React 19
- Tailwind CSS 4（基础样式主要集中在 `src/app/globals.css`）
- Framer Motion：地图点亮、照片墙、时间轴和页面过渡
- lucide-react：图标
- SQLite + Prisma 6.19
- 本地文件存储：`travel-data/photos`
- 地图数据：`public/maps` 下的 GeoJSON/JSON，运行时在浏览器中转换为 SVG 路径

常用命令（Windows PowerShell）：

```powershell
npm.cmd install
npm.cmd run setup       # 地图同步、Prisma 生成、数据库 push、seed
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd run start -- -p 3210
```

本地生产预览约定使用 `http://localhost:3210`。构建前如果已有 3210 端口进程，应先停止旧的 Next 进程，再执行 build，完成后重新启动预览。

## 3. 目录和关键代码路径

```text
src/
  app/
    page.tsx                         全国首页服务端入口
    timeline/page.tsx                年月聚合后的时间轴服务端入口
    stats/page.tsx                   统计页服务端入口
    province/[id]/page.tsx           省份详情服务端入口
    city/[id]/page.tsx               城市详情服务端入口
    api/photos/route.ts              批量上传 + 批量删除
    api/photos/[id]/route.ts         单张删除（保留作 API 能力）
    api/cities/[id]/wall/route.ts    城市照片墙开关和星标封面保存
    api/files/[id]/route.ts          本地图片读取
    api/archive/route.ts              清空全部档案（带确认、移动到 trash）
    globals.css                      全部视觉样式、主题和响应式规则
  components/
    home-client.tsx                  首页布局和上传入口
    atlas-map.tsx                    地图、照片组、连线、拖动和点击交互
    city-photo-wall.tsx              城市照片墙、星标、批量删除
    province-client.tsx              省份地图和城市目录
    timeline-view.tsx                多列己字形时间轴
    stats-client.tsx                 全国统计和省份排名
    upload-dialog.tsx                批量上传表单
    theme-toggle.tsx                 深色/浅色主题切换
```

## 4. 数据模型和数据语义

Prisma schema 位于 `prisma/schema.prisma`：

- `Province`：省级区域，`id`、`name`、中心点。
- `City`：地级城市，含 `provinceId`、经纬度、`showOnWall`。
- `TravelRecord`：一次城市旅行归档，含 `cityId`、日期、描述、创建时间。
- `Photo`：照片，含文件路径、文件名、MIME、GPS、拍摄时间、`featured`。

关键语义：

1. `City.showOnWall` 控制这个城市的照片组是否出现在地图照片墙。城市是否点亮由是否存在 `TravelRecord` 决定，两者独立。
2. `Photo.featured=true` 表示照片是该城市首页照片墙封面，单个城市最多 3 张。地图只取 `showOnWall=true` 城市的星标照片。
3. 城市详情页的星标操作是即时保存，不需要额外点击保存按钮。添加第一张星标会自动开启照片墙；取消最后一张星标会关闭照片墙。
4. 删除照片时，如果一个 `TravelRecord` 已没有照片，会一起删除该旅行记录；如果城市已没有任何星标照片，会将 `showOnWall` 设为 `false`。
5. 清空全部档案走 `src/app/api/archive/route.ts`，会先把原图移动到 `travel-data/trash/archive-*`，数据库记录再删除，便于恢复。

数据库和原图位置：

- SQLite：`travel-data/metadata/travel.db`
- 原图：`travel-data/photos/{year}/{month}/`
- 清空归档备份：`travel-data/trash/archive-{timestamp}/`

不要在调试或开发新功能时删除 `travel-data`、重建数据库或覆盖照片，除非用户明确要求清空或迁移。

## 5. 全国地图和省级地图行为

`AtlasMap` 通过 `mapUrl` 加载地图 JSON，使用 `d3-geo` 的 `geoIdentity().reflectY(true).fitExtent(...)` 生成 SVG path。全国首页默认开启省级覆盖层：省份整体可悬停和点击，点击省份进入 `/province/{id}`；首页不会直接把省份覆盖层交互降级为城市点击。

省级地图调用 `AtlasMap` 时传入省份城市数据、对应省份地图 JSON、`provinceOverlay={false}`，此时可以点击具体城市并打开城市抽屉。

照片组规则：

- 来源是 `data.recentPhotos`，只包含 `showOnWall=true` 且 `featured=true` 的照片。
- 每个城市最多展示 3 张照片，照片组按城市第一次归档时间排序，避免新城市加入后已有照片组频繁移位。
- 整组照片通过 `.memory-group-dragger` 拖动；位置保存在浏览器 `localStorage`。
- 存储 key：`travel-atlas-wall-position-{storageScope}-{cityId}`。
- 当前格式是 v2 比例锚点 `{ version: 2, left, top }`，`left/top` 是照片组左上角相对地图画板宽高的 0~1 比例。旧版像素偏移 `{x,y}` 会在首次读取时自动迁移。
- ResizeObserver 监听画板尺寸变化，尺寸变化只重新换算显示位置，不覆盖比例锚点，因此缩小再放大可以回到原位置。

地图照片点击区域：

- `.map-photo-image`：点击图片本身打开大图 lightbox。
- `.map-photo-frame`：点击图片下方白色相框进入城市档案。
- 全国地图链接带 `?from=atlas`。
- 省级地图和省份城市目录链接带 `?from=province&provinceId={provinceId}`。

城市详情页 `src/app/city/[id]/page.tsx` 根据 `searchParams.from` 决定顶部返回目标：全国来源返回 `/`，省份来源返回对应 `/province/{id}`。没有来源参数时按全国入口处理，时间轴等页面进入城市档案会回到全国地图。

## 6. 城市照片墙

`CityPhotoWall` 负责城市详情页：

- 照片瀑布流和大图预览。
- 星标封面：直接调用 `PATCH /api/cities/{id}/wall` 保存，无二次保存按钮。
- 星标最多 3 张。第 4 张点击会显示“最多选择 3 张作为照片墙展示。”状态提示，不会发请求。
- “展示照片 / 仅点亮城市”开关也直接保存；它可以在保留城市点亮的同时隐藏照片组。
- 星标保存调用 `router.refresh()` 更新服务端数据，但城市照片墙组件不使用会随 `featured` 状态变化的 React key，避免整个照片墙重新挂载、照片重新播放入场动画而闪烁。

批量删除：

1. 点击“批量删除”进入选择模式。
2. 点击任意照片可单选/取消选择；支持“全选”和“取消全选”。
3. 点击“删除选中照片”后弹出确认框。
4. 前端调用 `DELETE /api/photos`，body 为 `{ "ids": string[] }`。
5. 接口在一个 Prisma transaction 中删除照片、清理空旅行记录、更新没有星标照片的城市，并在事务完成后删除本地原图。

单张接口 `DELETE /api/photos/{id}` 仍保留，但当前 UI 不显示逐张删除按钮。若未来需要单张删除，应继续复用确认流程和“空旅行记录/照片墙状态”清理语义。

## 7. 上传流程

`UploadDialog` 支持批量选择照片。`POST /api/photos` 使用 multipart/form-data：

- 自动模式优先解析 EXIF GPS、拍摄时间，GPS 映射到城市。
- 无法定位的照片返回 422，并要求切换手动城市归档。
- 同城市同日期的照片归入同一个 `TravelRecord`。
- 新城市首次上传最多自动占用 3 个封面槽位；已有城市的新上传默认不自动成为封面。
- 原图写入 `travel-data/photos/{year}/{month}`，数据库保存相对路径。

## 8. 时间轴和统计

时间轴服务端入口 `src/app/timeline/page.tsx`：

- 按 `cityId + year + month` 聚合，因此同一城市同一个年月内多次上传只显示一个节点。
- 当前排序是年月从早到晚，城市 ID 作为稳定的第三排序键。
- `TimelineView` 桌面端每行 7 个节点，中等宽度 5 个，移动端纵向布局。
- 行之间保留交替方向和己字形转角。

统计页 `src/app/stats/page.tsx` / `stats-client.tsx` 从 `getAtlasData()` 自动计算已探索城市、全国覆盖率、剩余城市、照片数和省份排名。

## 9. 主题和动画

主题通过 `html[data-theme="dark"]` 控制，`ThemeToggle` 把选择保存到 `localStorage` 的 `travel-atlas-theme`。浅色模式是米白纸张主题；深色模式使用深棕背景、暖橙强调色。

地图连线：

- `.memory-line-base` 是基础虚线。
- `.memory-flow-orb` 是由 Framer Motion 直接计算坐标、沿“城市节点 -> 照片组”路径移动的单个发光圆点，仅深色模式显示；照片组拖动时圆点终点会同步更新。当前不依赖 SVG `animateMotion`，避免动态路径在部分浏览器中停滞。圆点不再被 `prefers-reduced-motion` 隐藏，因为它是地图状态反馈的一部分。
- `prefers-reduced-motion: reduce` 时隐藏流动光点，并降低动画影响。

不要在浅色模式直接覆盖现有连线颜色；深色模式需要单独使用 `html[data-theme="dark"] ...` 规则。

## 10. API 清单

| API | 方法 | 用途 |
|---|---|---|
| `/api/atlas` | GET | 获取全国地图、城市、省份、照片墙数据 |
| `/api/photos` | POST | 批量上传照片并创建旅行记录 |
| `/api/photos` | DELETE | 批量删除照片，body `{ids}` |
| `/api/photos/{id}` | DELETE | 单张删除照片 |
| `/api/files/{id}` | GET | 读取本地原图 |
| `/api/cities/{id}/wall` | PATCH | 保存城市照片墙开关和最多 3 个封面 ID |
| `/api/archive` | DELETE | 带文字确认的全量档案清空，原图移入 trash |

## 11. 后续 AI 接手规则

1. 先阅读本文件，再阅读实际磁盘上的相关组件；不要依赖旧对话中的代码快照。
2. 保留 SQLite、Prisma 和本地照片存储的现有语义，不要为了视觉改动破坏数据关系。
3. 不要使用 `git reset --hard`、递归删除工作区或清空 `travel-data`。
4. 不要重新排序 `GROUP_POSITIONS`，除非用户明确要求重排；位置存储已经按城市和比例锚点设计。
5. 修改照片墙、星标、删除、上传逻辑时，必须同时检查首页 `getAtlasData()` 的 `recentPhotos` 过滤规则。
6. 修改城市返回路径时，保留 `from=atlas` 与 `from=province&provinceId=` 约定。
7. 保留中文 UTF-8 文本和现有视觉语言，不要把页面改成后台管理表格。
8. 中等或复杂改动完成后至少运行 `npm.cmd run lint`、`npm.cmd run build`，并用本地浏览器检查深浅主题、地图点击、照片墙和控制台。

## 12. 当前验证基线

截至本文建立时：

- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。
- 本地生产预览端口为 3210。
- 全国地图照片点击可打开大图，相框点击可进入城市档案。
- 城市档案支持即时星标、最多 3 张限制提示、批量选择和确认删除。
- 城市来源返回路径、时间轴年月聚合与顺序、深色模式地图流动光点均已纳入当前实现。
