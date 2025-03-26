import type { IMultiValueInput } from '@/lib/workflow-api-parser';
import React, { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';

// 视图模式基础接口
export interface IViewComfyBase {
    title: string;
    description: string;
    textOutputEnabled?: boolean;
    previewImages: string[];
    inputs: IMultiValueInput[];
    advancedInputs: IMultiValueInput[];
    type?: 'image_generation' | 'smart_ps';
}

// 视图模式草稿接口
export interface IViewComfyDraft {
    type?: 'image_generation' | 'smart_ps';
    viewComfyJSON: IViewComfyBase;
    workflowApiJSON?: object | undefined;
    file?: File | undefined;
}

// 视图模式工作流接口
export interface IViewComfyWorkflow extends IViewComfyBase {
    id: string;
}

// ViewComfy JSON 文件接口
export interface IViewComfyJSON {
    file_type?: string;
    file_version?: string;
    version?: string;
    workflows: IViewComfy[];
}

// ViewComfy 配置接口
export interface IViewComfy {
    type?: 'image_generation' | 'smart_ps';
    viewComfyJSON: IViewComfyWorkflow;
    workflowApiJSON?: object | undefined;
    file?: File | undefined;
}

// 视图模式状态接口
export interface IViewComfyState {
    viewComfys: IViewComfy[];
    viewComfyDraft: IViewComfyDraft | undefined;
    currentViewComfy: IViewComfy | undefined;
}

// 定义 Action 类型
export enum ActionType {
    ADD_VIEW_COMFY = "ADD_VIEW_COMFY",
    UPDATE_VIEW_COMFY = "UPDATE_VIEW_COMFY",
    REMOVE_VIEW_COMFY = "REMOVE_VIEW_COMFY",
    SET_VIEW_COMFY_DRAFT = "SET_VIEW_COMFY_DRAFT",
    UPDATE_CURRENT_VIEW_COMFY = "UPDATE_CURRENT_VIEW_COMFY",
    RESET_CURRENT_AND_DRAFT_VIEW_COMFY = "RESET_CURRENT_AND_DRAFT_VIEW_COMFY",
    INIT_VIEW_COMFY = "INIT_VIEW_COMFY"
}

// 更新 Action 类型以使用枚举
export type Action =
    | { type: ActionType.ADD_VIEW_COMFY; payload: IViewComfy }
    | { type: ActionType.SET_VIEW_COMFY_DRAFT; payload: IViewComfyDraft | undefined }
    | { type: ActionType.UPDATE_VIEW_COMFY; payload: { viewComfy: IViewComfy, id: string } }
    | { type: ActionType.REMOVE_VIEW_COMFY; payload: IViewComfy }
    | { type: ActionType.UPDATE_CURRENT_VIEW_COMFY; payload: IViewComfy }
    | { type: ActionType.RESET_CURRENT_AND_DRAFT_VIEW_COMFY; payload: undefined }
    | { type: ActionType.INIT_VIEW_COMFY; payload: IViewComfyJSON }

// 状态处理器
function viewComfyReducer(state: IViewComfyState, action: Action): IViewComfyState {

    switch (action.type) {
        case ActionType.ADD_VIEW_COMFY: {
            // 添加新的视图配置
            const data = {
                ...state,
                viewComfys: [...state.viewComfys, { ...action.payload }],
                currentViewComfy: {
                    type: action.payload.type,
                    viewComfyJSON: action.payload.viewComfyJSON,
                    workflowApiJSON: action.payload.workflowApiJSON,
                    file: action.payload.file
                },
                viewComfyDraft: {
                    type: action.payload.type,
                    viewComfyJSON: action.payload.viewComfyJSON,
                    workflowApiJSON: action.payload.workflowApiJSON,
                    file: action.payload.file
                }
            };

            return data;
        }
        case ActionType.SET_VIEW_COMFY_DRAFT:
            return {
                ...state,
                viewComfyDraft: action.payload ? { ...action.payload } : undefined
            };
        case ActionType.UPDATE_VIEW_COMFY:
            return {
                ...state,
                viewComfys: state.viewComfys.map((item) =>
                    item.viewComfyJSON.id === action.payload.id
                        ? { ...action.payload.viewComfy }
                        : item
                ),
                currentViewComfy: {
                    type: action.payload.viewComfy.type,
                    viewComfyJSON: action.payload.viewComfy.viewComfyJSON,
                    workflowApiJSON: action.payload.viewComfy.workflowApiJSON,
                    file: action.payload.viewComfy.file
                },
                viewComfyDraft: {
                    type: action.payload.viewComfy.type,
                    viewComfyJSON: action.payload.viewComfy.viewComfyJSON,
                    workflowApiJSON: action.payload.viewComfy.workflowApiJSON,
                    file: action.payload.viewComfy.file
                }
            };
        case ActionType.REMOVE_VIEW_COMFY: {
            const data = {
                ...state,
                viewComfys: state.viewComfys.filter((item) => item.viewComfyJSON.id !== action.payload.viewComfyJSON.id)
            };

            if (data.viewComfys.length > 0) {
                data.currentViewComfy = data.viewComfys[0];
                data.viewComfyDraft = {
                    type: data.viewComfys[0].type,
                    viewComfyJSON: data.viewComfys[0].viewComfyJSON,
                    workflowApiJSON: data.viewComfys[0].workflowApiJSON,
                    file: data.viewComfys[0].file
                };
            } else {
                data.currentViewComfy = undefined;
                data.viewComfyDraft = undefined;
            }

            return data;
        }
        case ActionType.UPDATE_CURRENT_VIEW_COMFY:
            return {
                ...state,
                currentViewComfy: action.payload,
                viewComfyDraft: action.payload
            }
        case ActionType.RESET_CURRENT_AND_DRAFT_VIEW_COMFY:
            return {
                ...state,
                currentViewComfy: undefined,
                viewComfyDraft: undefined
            }
        case ActionType.INIT_VIEW_COMFY: {
            if (action.payload.workflows.length === 0) {
                return state;
            }
            
            // 确保每个工作流都有 type 字段
            const workflows = action.payload.workflows.map(workflow => ({
                type: workflow.type,
                viewComfyJSON: workflow.viewComfyJSON,
                workflowApiJSON: workflow.workflowApiJSON,
            }));
            
            return {
                viewComfys: workflows,
                currentViewComfy: workflows.length > 0 ? workflows[0] : undefined,
                viewComfyDraft: workflows.length > 0 ? {
                    type: workflows[0].type,
                    viewComfyJSON: workflows[0].viewComfyJSON,
                    workflowApiJSON: workflows[0].workflowApiJSON
                } : undefined,
            };
        }
        default:
            return state;
    }
}

interface ViewComfyContextType {
    viewComfyState: IViewComfyState;
    viewComfyStateDispatcher: Dispatch<Action>;
}

// 创建 Context
const ViewComfyContext = createContext<ViewComfyContextType | undefined>(undefined);

export function ViewComfyProvider({ children }: { children: ReactNode }) {
    // 使用 Reducer 创建状态和分派器
    const [viewComfyState, dispatch] = useReducer(viewComfyReducer, { viewComfys: [], viewComfyDraft: undefined, currentViewComfy: undefined });

    return (
        <ViewComfyContext.Provider value={{ viewComfyState, viewComfyStateDispatcher: dispatch }}>
            {children}
        </ViewComfyContext.Provider>
    );
}

// 自定义 Hook
export function useViewComfy() {
    const context = useContext(ViewComfyContext);
    if (context === undefined) {
        throw new Error('useViewComfy must be used within a ViewComfyProvider');
    }
    return context;
}
