export interface PromptTag {
  id: string;
  name: string;
  color?: string;
}

export interface PromptItem {
  id: string;
  prompt: string;
  promptEn: string;
  imageUrl?: string;
  tags: PromptTag[];
  parameters: Record<string, string>;
  createdAt: string;
  updatedAt: string;
} 