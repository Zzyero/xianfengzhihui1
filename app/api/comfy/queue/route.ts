import { type NextRequest, NextResponse } from 'next/server';
import { ComfyUIService } from '@/app/services/comfyui-service';
import { ErrorResponseFactory } from '@/app/models/errors';

const errorResponseFactory = new ErrorResponseFactory();
const comfyUIService = new ComfyUIService();

export async function GET() {
    try {
        const queue = await comfyUIService.comfyUIAPIService.getQueue();
        return NextResponse.json(queue);
    } catch (error) {
        const responseError = errorResponseFactory.getErrorResponse(error);
        return NextResponse.json(responseError, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { clear } = await request.json();
        if (clear) {
            await comfyUIService.comfyUIAPIService.clearQueue();
            return new NextResponse(null, { status: 200 });
        }
        return new NextResponse("Invalid request", { status: 400 });
    } catch (error) {
        const responseError = errorResponseFactory.getErrorResponse(error);
        return NextResponse.json(responseError, { status: 500 });
    }
} 