import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ContextCardProps {
  context: {
    text: string;
    article_id?: string;
    score?: number;
  };
}

const ContextCard = ({ context }: ContextCardProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="p-3 shadow-soft">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {context.article_id && (
                <Badge variant="secondary" className="text-xs">
                  {context.article_id}
                </Badge>
              )}
              {context.score !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {(context.score * 100).toFixed(0)}% match
                </span>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {context.text}
            </p>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default ContextCard;
