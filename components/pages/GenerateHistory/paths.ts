/**
 * 图片存储路径配置
 */
// 图片存储的基本路径（相对于项目根目录）
export const IMAGE_BASE_PATH = "components/pages/GenerateHistory/photos";

// 图片列表JSON文件路径
export const IMAGE_LIST_JSON_PATH = "components/pages/GenerateHistory/image-list.json";

// 获取完整的图片存储路径
export function getImageDirectory() {
  return require('path').join(process.cwd(), IMAGE_BASE_PATH);
}

// 获取完整的图片列表JSON文件路径
export function getImageListJsonPath() {
  return require('path').join(process.cwd(), IMAGE_LIST_JSON_PATH);
} 