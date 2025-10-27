import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { FileText } from "lucide-react";

const ArticleNode = ({ data }: NodeProps) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-pink-500 text-white border-2 border-pink-600 min-w-[150px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        <div className="text-sm font-semibold">
          {data.label}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  );
};

export default memo(ArticleNode);
