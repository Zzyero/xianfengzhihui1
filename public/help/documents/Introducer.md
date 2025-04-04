# 先锋·智绘

先锋·智绘是基于ViewComfy、ComfyUI的智能绘画生图工具。

## 示例图片

下面是一个示例图片：

![示例图片](example.jpg)

## 安装和演示

### 安装步骤
1. 安装 [Node.js v20.18](https://nodejs.org/) 或更高版本（推荐 v20.18）

2. 克隆仓库
```bash
git clone git@gitee.com:zzy17539555805/pioneer---smart-painting.git
```

3. 安装依赖并启动开发服务器
```bash
npm install
npm run dev
```

## 项目结构

### 📁 app - 核心接口以及功能组件
- **api/** - API路由目录
  - `comfy/` - ComfyUI相关API
    - `route.ts` - 解析请求中的工作流配置,处理 viewComfy 配置参数,处理上传的文件,运行工作流并返回生成的图片流
  - `playground/` - 预览和测试相关API
    - `preview-images/route.ts` - 实现了一个完整的文件上传和删除的API端点，用于处理预览图片的上传和管理
    - `route.ts` - Next.js API 路由处理文件，主要用于读取 ViewComfy 配置文件
- **fonts/** - 加载字体
- **helpers/** - 处理 ComfyUI 工作流程中的错误，格式化ComfyUI错误输出
- **interfaces/** - 用于定义项目中使用的数据类型
- **models/** - 提供稳定的数据结构和错误处理机制
  - `comfy-workflow.ts` - 管理 ComfyUI 工作流配置
  - `error.ts` - 工作流错误处理系统
- **providers/** - 状态管理系统，整个应用的核心，管理着所有视图配置和工作流状态
- **services/**
  - `comfyui-api-service.ts` - 与 ComfyUI 后端建立 WebSocket 连接，用于实时接收工作流执行状态
  - `comfyui-service.ts` - 协调工作流执行和结果处理
- `constants.ts` - 集中管理配置常量
- `favicon.ico` - 网页图标
- `globals.css` - 提供全局样式基础和两个主题的样式
- `layout.tsx` - 整个应用的根布局文件，定义了基础页面结构
- `page.tsx` - 主页面组件，包括顶部导航栏、侧边栏、主内容区域、部署模态框
- `styles.scss` - 生成图片时的动画

### 📁 comfy - 存储工作流的json文件，保存工作流配置
- **inputs/**
- **workflows/**

### 📁 components - 存放所有组件
- **pages/** - 页面级组件集合
  - `playground/` - 工作流配置界面
    - `playground-form.tsx` - 表单管理组件
    - `playground-page.tsx` - 页面组件
    - `PlaygroundForm` - 定义一个动画
  - `view-comfy/`
    - `view-comfy-form-editor.tsx` - 工作流配置编辑器，管理表单状态，导出配置文件
    - `view-comfy-page.tsx` - 工作流配置编辑器主界面
  - `ui/` - 组件库
    - 完整的UI组件集合，包括alert-dialog、button、card等基础组件
  - `view-comfy/view-comfy-form.tsx` - 工作流输入输出转换前端核心文件
- `header.tsx` - 提供页面顶部导航栏
- `images-preview.tsx` - 生成图片预览
- `loader.tsx` - 圆点旋转加载动画
- `sidebar` - 侧边栏按钮
- `styles` - 提供表单、文本区域、复选框的基本样式
- `theme-provider.tsx` - 主题明暗切换功能
- `toggle.tsx` - 主题切换按钮
- `top-nav.tsx` - 导航栏按钮组件
- `workflow-switcher` - 工作流搜索功能以及ui

### 📁 hooks - 所有可复用逻辑
- **playground/**
  - `use-post-playground.ts` - 处理与comfyui通信，传递生成请求并接收生成的图像数据
- `use-media-query.ts` - 监听媒体查询，自适应调整ui窗口
- `use-toast.ts` - 提示临时消息系统

### 📁 lib - 复用代码
- `api-error-handler.tsx` - 统一处理api请求的所有错误
- `utils.ts` - 通用功能支持
- `workflow-api-parser.ts` - 将 API 返回的工作流数据转换为前端可用的格式

### 📁 node_modules - 运行npm install后安装的运行依赖

### 📁 pages - 将 pages 目录下文件转换为网站的路由

## 使用方法

### 表单编辑器
你可以将 ComfyUI 的 workflow_api.json 文件拖放到表单编辑器中。它会生成一个新的表单，你可以用它来配置在操作界面中显示的输入项。

### 操作界面
操作界面是一个简化的用户界面，你可以在这里运行你的工作流。

### 查看模式
查看模式只会加载操作界面页面，可以轻松转换为网页应用。如果你想与他人分享你的工作流，但不想分享 workflow_api.json，也不需要他们安装 ComfyUI。

#### 启用查看模式
1. 将生成的 view_comfy.json 放入项目根目录
2. 编辑 .env 文件：
```bash
.env 文件 ->
NEXT_PUBLIC_VIEW_MODE="true"
VIEW_COMFY_FILE_NAME="view_comfy.json"

npm run dev
```

### 表单编辑器高级功能
你也可以直接将 view_comfy.json 拖放到表单编辑器中进行编辑，而无需 workflow_api.json。

## Docker部署

```bash
docker build -t viewcomfy .

docker run -it --name viewcomfy-container -p 3000:3000 viewcomfy
```

## 技术栈
先锋·智绘是一个 Next.js 应用 - [Next.js 文档](https://nextjs.org/docs)

## 贡献
欢迎通过反馈、建议、问题或拉取请求做出贡献。

# 提示词库功能说明

## 功能概述
提示词库是一个用于管理和使用提示词的功能模块，支持以下主要功能：
- 添加新的提示词（支持中英文）
- 编辑现有提示词
- 删除提示词（包括关联图片）
- 导入提示词
- 图片上传和预览
- 标签管理
- 参数配置
- 自动清理未使用图片

## 页面切换逻辑
提示词库实现了智能的页面切换逻辑，主要包括以下几个方面：

### 1. 初始页面加载
- 默认情况下，系统会根据 `viewMode` 的值决定显示哪个页面：
  - 如果 `viewMode` 为 true，显示 Playground 页面
  - 如果 `viewMode` 为 false，显示 WorkflowApi 页面
- 这个逻辑在 `app/page.tsx` 中通过 `useState` 的初始化函数实现

### 2. 提示词详情页面
- 提示词详情页面通过动态路由 `/prompt-library/[id]` 实现
- 从详情页返回时，会自动切换到主页的提示词库标签页
- 编辑或删除操作完成后，也会自动返回到主页的提示词库标签页

### 3. 页面刷新处理
- 当用户刷新页面时，系统会保持在当前页面
- 如果在详情页刷新，会保持在详情页面

### 4. 编辑状态处理
- 系统会检查 URL 中的 `edit` 参数
- 如果存在 `edit` 参数，会自动打开编辑表单并加载对应的提示词数据
- 编辑完成后会返回到主页的提示词库标签页

## 删除功能说明
提示词库的删除功能包含以下特性：

### 1. 删除流程
- 当用户点击删除按钮时，会先显示确认对话框
- 确认删除后，系统会：
  1. 删除提示词数据
  2. 删除关联的图片文件
  3. 更新提示词列表

### 2. 图片删除
- 系统会自动删除存储在 `public/images/prompts` 目录下的图片文件
- 删除操作通过 API 路由 `/api/upload` 处理
- 包含安全检查，防止目录遍历攻击

### 3. 错误处理
- 如果图片删除失败，系统会记录错误但不会影响提示词数据的删除
- 所有删除操作都有错误处理和日志记录

## 图片管理功能
提示词库实现了完整的图片管理机制：

### 1. 图片存储
- 所有图片存储在 `public/images/prompts` 目录下
- 图片文件名使用时间戳生成，确保唯一性
- 支持 PNG、JPG 等常见图片格式

### 2. 图片清理机制
- 系统会自动维护图片文件与提示词数据的一致性
- 在以下情况下会触发图片清理：
  1. 删除提示词时，自动删除关联的图片
  2. 保存提示词数据时，自动清理未使用的图片
  3. 导入新数据时，自动清理不再使用的图片

### 3. 清理流程
- 获取 `prompt-library.json` 中所有使用的图片列表
- 扫描 `public/images/prompts` 目录中的所有图片
- 删除不在使用列表中的图片文件
- 记录清理操作的日志，包括成功和失败的文件

### 4. 错误处理
- 如果某个文件删除失败，会记录错误但继续处理其他文件
- 所有清理操作都有完整的错误处理和日志记录
- 清理失败不会影响提示词数据的正常使用

## 目录结构
```
├── app/
│   └── prompt-library/
│       └── [id]/           # 提示词详情页面
│           └── page.tsx    # 提示词详情页面组件
├── components/
│   └── prompt-library/     # 提示词库相关组件
│       ├── prompt-library.tsx # 提示词库主组件
│       ├── prompt-form.tsx   # 提示词表单组件
│       ├── prompt-detail.tsx # 提示词详情组件
│       ├── image-upload.tsx  # 图片上传组件
│       └── types.ts         # 类型定义
├── lib/
│   └── services/
│       └── prompt-library-service.ts # 提示词库服务
└── data/
    └── prompt-library.json  # 提示词数据存储文件
```

## 核心文件说明

### 1. 数据类型 (types.ts)
- `PromptItem`: 提示词数据结构
  - id: 唯一标识符
  - prompt: 中文提示词
  - promptEn: 英文提示词
  - imageUrl: 图片URL
  - tags: 标签数组
  - parameters: 参数配置
  - createdAt/updatedAt: 创建和更新时间

### 2. API接口 (route.ts)
- GET `/api/prompt-library`: 获取提示词列表
- POST `/api/prompt-library`: 保存提示词列表
- POST `/api/upload`: 处理图片上传

### 3. 服务层 (prompt-library-service.ts)
- `getPrompts()`: 获取提示词列表
- `savePrompts()`: 保存提示词列表
- `importPrompts()`: 导入提示词数据

### 4. 组件
- `PromptLibrary`: 提示词库主组件，负责展示提示词列表和处理交互
- `PromptForm`: 提示词表单，用于添加/编辑提示词
- `ImageUpload`: 图片上传组件，支持URL输入和文件上传

## 主要功能实现

### 提示词管理
- 提示词支持中英文双语输入
- 使用JSON文件存储提示词数据
- 支持标签管理和筛选
- 支持预设参数配置（步数、CFG、采样器、种子）
- 支持从ComfyUI生成的PNG图片中解析提示词和参数

### 图片管理
- 支持图片URL输入
- 支持本地图片上传
- 图片存储在 public/images/prompts 目录
- 支持图片预览和双击放大

### 数据导入导出
- 支持从JSON文件导入提示词
- 数据自动保存到服务器和本地存储

## 使用说明

1. 添加提示词
   - 点击"添加"按钮
   - 填写中英文提示词
   - 选择或上传图片
   - 添加标签
   - 配置所需参数
   - 点击保存

2. 导入提示词
   - 点击"导入"按钮
   - 选择JSON格式的提示词文件
   - 系统会自动导入数据

3. 解析ComfyUI图片
   - 点击"解析图片"按钮
   - 选择由ComfyUI生成的PNG图片
   - 系统会自动提取图片中的提示词和参数信息
   - 提取的信息会自动填充到表单中
   - 修改或补充信息后点击保存

4. 参数配置
   - 步数 (steps): 生成图片的迭代次数
   - CFG: 提示词引导系数
   - 采样器 (sampler): 使用的采样算法
   - 种子 (seed): 随机种子值

## 注意事项
1. 图片上传支持的格式：JPG、PNG、GIF等常见图片格式
2. 提示词数据会自动保存到服务器
3. 参数值应该符合实际使用需求
4. 建议定期备份提示词数据
