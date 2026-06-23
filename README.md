# 🗺️ Journey Map（旅程地图）

> 一个基于地图画布的个人旅程记录与轻社交工具 —— VibeCoding 参赛作品

**[GitHub → Zola-ops/travel-map](https://github.com/Zola-ops/travel-map)**

---

## ✨ 产品理念

Journey Map 将个人叙事、亲密关系和陌生人社交三层情感需求融合为一个有温度的 Web 应用。以「地图」为核心载体，让每个人都能在数字世界留下属于自己的旅程轨迹。

## 🚀 核心功能

### 📍 个人足迹（Personal Journey）
- 预设模板（人生轨迹 / 年度足迹）+ 自定义旅程创建
- 按时间顺序标记城市，选择交通方式
- GSAP 驱动的微缩交通动画旅程预览
- 支持导出为静态足迹图（html2canvas → PNG）

### 🗺️ 双人地图（Dual Map）
- 两人各自标记成长路径，系统识别并高亮交汇点
- 生成专属于两个人的相遇故事地图
- 支持双人路径对比导出

### 🚪 任意门（Any Door）
- 随机传送至世界任意城市，发现陌生人留下的文字彩蛋
- 提交自己的故事，体验异步社交的惊喜
- 城市光点密度图，直观展示彩蛋分布

## 🏗️ 技术架构

### 前端（Client）

| 技术 | 用途 |
|------|------|
| **Vue 3** + TypeScript | 响应式 UI 框架 |
| **Vite** | 极速构建工具 |
| **Pinia** | 状态管理 |
| **Vue Router** | 单页路由 |
| **ECharts** + echarts-china-map | 地图可视化 |
| **GSAP** | 旅程路径动画引擎 |
| **html2canvas** | 地图截图导出 |
| **Tailwind CSS** | 原子化样式 |
| **Axios** | HTTP 请求 |

### 后端（Server）

| 技术 | 用途 |
|------|------|
| **Express** | RESTful API 服务 |
| **better-sqlite3** | 轻量嵌入式数据库 |
| **express-rate-limit** | 请求限流保护 |
| **CORS** | 跨域资源共享 |
| **tsx** / TypeScript | 开发与构建 |

### 部署

- **Docker** 一键部署（含 nginx 反向代理）
- **SQLite** 无需额外数据库服务
- **UUID** 匿名用户识别，零注册门槛

## 📁 项目结构

```
travel-map/
├── client/                     # Vue 3 前端
│   ├── src/
│   │   ├── components/         # 核心组件
│   │   │   ├── AnimationPlayer.vue   # GSAP 动画播放器
│   │   │   ├── AnyDoor.vue           # 任意门彩蛋组件
│   │   │   ├── CityPicker.vue        # 城市选择器
│   │   │   ├── DualMapCreator.vue    # 双人地图编辑器
│   │   │   ├── EggCard.vue           # 彩蛋卡片
│   │   │   ├── JourneyEditor.vue     # 旅程编辑器
│   │   │   ├── JourneyViewer.vue     # 旅程预览
│   │   │   ├── MapCanvas.vue         # ECharts 地图画布
│   │   │   └── TemplateSelector.vue  # 模板选择器
│   │   ├── pages/              # 页面视图
│   │   │   ├── PersonalJourney.vue   # 个人足迹页
│   │   │   ├── DualMap.vue           # 双人地图页
│   │   │   └── AnyDoor.vue           # 任意门页
│   │   ├── composables/        # 组合式函数
│   │   ├── data/               # 预设数据
│   │   ├── types/              # TypeScript 类型
│   │   ├── utils/              # 工具函数
│   │   ├── router/             # 路由配置
│   │   └── App.vue             # 根组件
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
├── server/                     # Express 后端
│   ├── src/
│   │   ├── server.ts           # 服务入口
│   │   ├── db/                 # 数据库初始化
│   │   ├── middleware/         # 中间件（CORS、限流）
│   │   └── routes/             # API 路由
│   │       ├── journeys.ts    # 旅程 CRUD
│   │       ├── duo.ts         # 双人地图
│   │       ├── eggs.ts        # 任意门彩蛋
│   │       └── cities.ts      # 城市数据
│   └── tsconfig.json
├── docker/                     # 部署配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
├── package.json                # 根 monorepo 配置
└── .env.example
```

## 🚦 快速开始

### 环境要求

- Node.js ≥ 18
- npm

### 本地开发

```bash
# 克隆项目
git clone https://github.com/Zola-ops/travel-map.git
cd travel-map

# 安装依赖
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 启动开发服务器（前后端同时启动）
npm run dev
```

- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:3000`

### 环境变量

复制 `.env.example` 为 `.env`：

```env
# Server
PORT=3000
DB_PATH=./data/journey.db

# CORS (production domain)
CORS_ORIGIN=https://your-domain.com

# Optional: AMap API Key for geocoding (V2.0)
# AMAP_API_KEY=your_amap_key
```

### Docker 部署

```bash
cd docker
docker-compose up -d
```

### 构建生产版本

```bash
npm run build    # 构建前端
npm start        # 启动生产服务器
```

## 🎨 设计亮点

| 亮点 | 说明 |
|------|------|
| **GSAP 路径动画** | 旅程路径逐帧绘制，配合交通工具微缩动画，让静态地图「活」起来 |
| **双地图视图** | ECharts + 中国地图数据，支持缩放、拖拽、标记 |
| **任意门彩蛋** | 随机传送机制 + 用户投稿彩蛋，打造陌生人之间的异步温暖连接 |
| **零注册体验** | UUID 自动分配匿名身份，打开即用，无摩擦 |
| **截图导出** | html2canvas 一键生成分享图片，适配社交媒体传播 |

## 📡 API 路由

| 模块 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 旅程 | `/api/journeys` | GET/POST | 查询 / 创建旅程 |
| 双人 | `/api/duo` | GET/POST | 双人地图数据 |
| 彩蛋 | `/api/eggs` | GET/POST | 任意门彩蛋 |
| 城市 | `/api/cities` | GET | 城市数据 |

## 🗓️ 版本规划

| 版本 | 内容 |
|------|------|
| **V1.0（当前）** | 个人足迹（2 模板 + 自定义）+ 双人地图 + 任意门彩蛋 + 截图导出 |
| **V2.0（计划）** | 照片 EXIF 导入、视频动画导出、更多模板、时空重合点检测、手动地图选点 |

## 📄 License

MIT

---

> 🎯 Built with ❤️ for VibeCoding Competition
>
> 用代码丈量世界，用地图记录旅程。
