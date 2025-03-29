export interface PromptTag {
  id: string;
  name: string;
  color: string;
}

export interface PromptParameters {
  steps: string;
  cfg?: string;
  sampler: string;
  seed: string;
  scheduler: string;
  denoise: string;
  negative?: string;
  model?: string;
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