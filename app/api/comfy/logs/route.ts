import { NextResponse } from 'next/server';
import { getLogs } from '@/app/services/logs-service';

// 获取日志的API端点
export async function GET() {
    return NextResponse.json(getLogs());
} 