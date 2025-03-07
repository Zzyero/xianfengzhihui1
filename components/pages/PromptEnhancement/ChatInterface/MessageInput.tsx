"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, StopCircle } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (message: string, model: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  onResize: (height: number) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onStop,
  isGenerating,
  onResize
}) => {
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const newHeight = Math.min(200, Math.max(56, textarea.scrollHeight));
      textarea.style.height = `${newHeight}px`;
      onResize(newHeight);
    };

    textarea.addEventListener('input', adjustHeight);
    return () => textarea.removeEventListener('input', adjustHeight);
  }, [onResize]);

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSend(message, selectedModel);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px';
      onResize(56);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          className={cn(
            "min-h-[56px] max-h-[200px] pr-20 resize-none",
            "rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0",
            "border-0 focus-visible:border-0"
          )}
        />
        <div className="absolute right-4 bottom-3">
          {isGenerating ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onStop}
              className="h-8 w-8 rounded-lg"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="h-8 w-8 rounded-lg"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput; 