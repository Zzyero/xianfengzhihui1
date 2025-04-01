export interface PromptTag {
  id: string;
  name: string;
  color: string;
}

export interface PromptParameters {
  steps: string;
  sampler: string;
  seed: string;
  scheduler: string;
  denoise: string;
  cfg?: string;
  negative?: string;
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
}

export type PartialPromptParameters = Partial<PromptParameters>;

export type PartialPromptItem = Partial<Omit<PromptItem, 'parameters'>> & {
  parameters?: PartialPromptParameters;
}; 