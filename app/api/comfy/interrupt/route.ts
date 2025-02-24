import { type NextRequest, NextResponse } from 'next/server';
import { ComfyUIService } from '@/app/services/comfyui-service';
import { ErrorResponseFactory } from '@/app/models/errors';

const errorResponseFactory = new ErrorResponseFactory();
const comfyUIService = new ComfyUIService();

export async function POST() {
    try {
        await comfyUIService.comfyUIAPIService.interruptQueue();
        return new NextResponse(null, { status: 200 });
    } catch (error) {
        const responseError = errorResponseFactory.getErrorResponse(error);
        return NextResponse.json(responseError, { status: 500 });
    }
} 