// 日志服务 - 处理应用程序日志
// 存储最近的日志
const recentLogs: string[] = [];
const MAX_LOGS = 10;

/**
 * 添加日志到最近的日志列表
 * @param log 要添加的日志
 */
export function addLog(log: string) {
    // 只保留包含进度信息的日志
    if (log.includes('当前进度:')) {
        // 添加到数组开头
        recentLogs.unshift(log);
        
        // 保持日志数量在限制内
        if (recentLogs.length > MAX_LOGS) {
            recentLogs.pop();
        }
    }
}

/**
 * 获取所有最近的日志
 * @returns 最近的日志列表
 */
export function getLogs() {
    return recentLogs;
} 