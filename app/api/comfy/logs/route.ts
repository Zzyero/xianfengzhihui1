import { NextResponse } from 'next/server';

// 存储最近的日志
const recentLogs: string[] = [];
const MAX_LOGS = 10;

// 添加日志的函数
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

// 获取日志的API端点
export async function GET() {
    return NextResponse.json(recentLogs);
} 