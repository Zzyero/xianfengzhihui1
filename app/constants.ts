// 工作流文件名
export const viewComfyFileName = process.env.VIEW_COMFY_FILE_NAME || "view_comfy.json";

// 缺少工作流文件错误
export const missingViewComfyFileError = `The ${viewComfyFileName} file is missing from the root of your project, \nor set the VIEW_COMFY_FILE_NAME environment variable to the right path.`;

// 无法连接到ComfyUI错误
export const ComfyUIConnRefusedError = (comfyUrl: string) => {
    return `Cannot connect to ComfyUI using ${comfyUrl}, make sure that you have a ComfyUI instance running and that the URL is correct \nor you can change the ComfyUI URL in the .env file using the variables COMFYUI_API_URL and if you're using SSL/TLS set COMFYUI_SECURE to true`
}
    
// 种子输入值
export const SEED_LIKE_INPUT_VALUES = ["seed", "noise_seed", "rand_seed"];

// 上传预览图片路径
export const UPLOAD_PREVIEW_IMAGES_PATH = "preview_images";