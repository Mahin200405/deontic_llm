import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/badge";

const modalityColors: Record<string, string> = {
  OBLIGATION: "bg-primary text-primary-foreground border-primary",
  PROHIBITION: "bg-destructive text-destructive-foreground border-destructive",
  PERMISSION: "bg-status-ok text-white border-status-ok",
  EXEMPTION: "bg-status-refine text-white border-status-refine",
  RECOMMENDATION: "bg-accent text-accent-foreground border-accent",
};

const ClauseNode = ({ data }: NodeProps) => {
  const modality = data.modality || "UNKNOWN";
  const colorClass = modalityColors[modality] || "bg-muted text-muted-foreground";

  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-card border-2 border-border min-w-[250px] max-w-[300px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="space-y-2">
        <Badge variant="default" className={`${colorClass} text-xs font-semibold`}>
          {modality}
        </Badge>

        <div className="text-sm font-medium line-clamp-2">
          {data.label}
        </div>

        {data.object && (
          <div className="text-xs text-muted-foreground line-clamp-1">
            {data.object}
          </div>
        )}

        {data.condition && (
          <div className="text-xs italic text-muted-foreground line-clamp-1">
            if: {data.condition}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  );
};

export default memo(ClauseNode);
