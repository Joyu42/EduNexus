import { KBDocument } from "@/lib/client/kb-storage";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronDown, FileText } from "lucide-react";

interface KBDocumentPickerProps {
  documents: KBDocument[];
  selectedDocIds: string[];
  onChange: (selectedIds: string[]) => void;
  className?: string;
}

export function KBDocumentPicker({
  documents,
  selectedDocIds,
  onChange,
  className,
}: KBDocumentPickerProps) {
  const isError = selectedDocIds.length === 0;

  const handleToggle = (docId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedDocIds, docId]);
    } else {
      onChange(selectedDocIds.filter((id) => id !== docId));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 flex items-center gap-1.5 px-2",
            isError ? "border-red-300 text-red-500 bg-red-50" : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
            className
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {isError ? "请选择文档" : `文档 ${selectedDocIds.length} 篇`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {documents.map((doc) => {
            const isChecked = selectedDocIds.includes(doc.id);
            return (
              <label
                key={doc.id}
                className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer text-sm"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => handleToggle(doc.id, !!checked)}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <span className="truncate flex-1">{doc.title}</span>
              </label>
            );
          })}
          {documents.length === 0 && (
            <div className="text-center p-4 text-xs text-muted-foreground">
              当前知识库暂无文档
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
