<FormField
    control={form.control}
    name="type"
    render={({ field }) => (
        <FormItem className="pb-5">
            <FormLabel>类型</FormLabel>
            <Select
                value={field.value}
                onValueChange={(value) => {
                    field.onChange(value);
                    const workflowType = value as 'image_generation' | 'smart_ps' | 'audio_generation' | 'video_generation';
                    setViewType(workflowType);
                }}
            >
                <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    <SelectItem value="image_generation">智能生图</SelectItem>
                    <SelectItem value="smart_ps">智能修图</SelectItem>
                    <SelectItem value="audio_generation">智能音频</SelectItem>
                    <SelectItem value="video_generation">智能视频</SelectItem>
                </SelectContent>
            </Select>
            <FormMessage />
        </FormItem>
    )}
/> 