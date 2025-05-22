/**
 * 图片存储路径配置
 */
import path from 'path';

// 图片存储的绝对路径
export const IMAGE_BASE_PATH = "../ComfyUI_windows_portable/ComfyUI/output";

// 图片列表JSON文件路径（相对于项目根目录）
export const IMAGE_LIST_JSON_PATH = "components/pages/GenerateHistory/image-list.json";

// 获取完整的图片存储路径
export function getImageDirectory() {
  // 如果已经是绝对路径，直接返回
  if (IMAGE_BASE_PATH.includes(':') || IMAGE_BASE_PATH.startsWith('/')) {
    return IMAGE_BASE_PATH;
  }
  // 否则视为相对路径，与项目根目录拼接
  return path.join(process.cwd(), IMAGE_BASE_PATH);
}

// 获取完整的图片列表JSON文件路径
export function getImageListJsonPath() {
  return path.join(process.cwd(), IMAGE_LIST_JSON_PATH);
} 