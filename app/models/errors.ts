// 错误基类
export class ErrorBase {
    public message: string;     // 错误消息
    public errors: string[];    // 错误详情数组
    public errorType: ErrorTypes; // 错误类型

    constructor(args: { message: string, errorType: ErrorTypes, errors?: string[] }) {
        this.message = args.message;
        this.errorType = args.errorType;
        this.errors = args.errors || [];
    }
}

// Comfy工作流错误类
export class ComfyWorkflowError extends ErrorBase {
    constructor(args: { message: string, errors: string[] }) {
        super({ message: args.message, errorType: ErrorTypes.COMFY_WORKFLOW, errors: args.errors });
    }
}

// Comfy通用错误类
export class ComfyError extends ErrorBase {
    constructor(args: { message: string, errors: string[] }) {
        super({ message: args.message, errorType: ErrorTypes.COMFY, errors: args.errors });
    }
}

// 响应错误类
export class ResponseError {
    public errorMsg: string;                // 错误消息
    public errorDetails: string | string[]; // 错误详情(可以是字符串或字符串数组)
    public errorType: ErrorTypes;           // 错误类型

    constructor(args: { errorMsg: string, error: string | string[], errorType: ErrorTypes }) {
        this.errorMsg = args.errorMsg;
        this.errorDetails = args.error;
        this.errorType = args.errorType;
    }
}

// 错误响应工厂类
export class ErrorResponseFactory {
    // 根据输入的错误创建标准的错误响应
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getErrorResponse(error: any): ResponseError {
        if (error.errorType) {
            // 如果错误包含errorType，创建对应的错误响应
            return new ResponseError({
                errorMsg: error.message,
                error: error.errors,
                errorType: error.errorType
            });
        }

        // 处理未知错误
        return new ResponseError({
            errorMsg: "Something went wrong",
            error: error.message,
            errorType: ErrorTypes.UNKNOWN
        });
    }
}

// 错误类型枚举
export enum ErrorTypes {
    COMFY_WORKFLOW = "ComfyWorkflowError",         // Comfy工作流错误
    COMFY = "ComfyError",                          // Comfy通用错误
    UNKNOWN = "UnknownError",                      // 未知错误
    VIEW_MODE_MISSING_FILES = "ViewModeMissingFilesError", // 视图模式缺失文件错误
}

