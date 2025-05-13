export interface PromptTag {
  id: string;
  name: string;
  color: string;
}

export interface PromptParameters {
  steps: string;
  sampler: string;
  scheduler: string;
  loraName: string;
  [key: string]: string | undefined;
}

export interface PromptItem {
  id: string;
  prompt: string;
  promptEn: string;
  imageUrl: string;
  parameters: PromptParameters;
  tags: PromptTag[];
  createdAt: string;
  updatedAt?: string;
  width?: number;
  height?: number;
}

export type PartialPromptParameters = Partial<PromptParameters>;

export type PartialPromptItem = Partial<Omit<PromptItem, 'parameters'>> & {
  parameters?: PartialPromptParameters;
  width?: number;
  height?: number;
}; 