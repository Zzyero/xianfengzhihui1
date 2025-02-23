# 先锋·智绘

先锋·智绘是基于ViewComfy、ComfyUI的智能绘画生图工具。666

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
# 构建镜像
docker build -t viewcomfy .

# 运行容器
docker run -it --name viewcomfy-container -p 3000:3000 viewcomfy
```

## 技术栈
先锋·智绘是一个 Next.js 应用 - [Next.js 文档](https://nextjs.org/docs)

## 贡献
欢迎通过反馈、建议、问题或拉取请求做出贡献。
