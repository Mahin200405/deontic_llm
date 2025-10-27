import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";

interface ClauseDisplayProps {
  clause: {
    modality?: string;
    actor?: string;
    actor_canonical?: string;
    action_verb?: string;
    object?: string;
    condition?: string;
    formulas?: { deontic?: string };
    confidence?: { classify?: number; formalize?: number; validate?: number };
    ambiguity?: Array<{ type: string; severity: string; notes: string }>;
  };
}

const modalityColors: Record<string, string> = {
  OBLIGATION: "bg-primary/10 text-primary border-primary/20",
  PROHIBITION: "bg-destructive/10 text-destructive border-destructive/20",
  PERMISSION: "bg-status-ok/10 text-status-ok border-status-ok/20",
  EXEMPTION: "bg-status-refine/10 text-status-refine border-status-refine/20",
  RECOMMENDATION: "bg-accent-foreground/10 text-accent-foreground border-accent-foreground/20",
};

const ClauseDisplay = ({ clause }: ClauseDisplayProps) => {
  const actor = clause.actor_canonical || clause.actor;

  return (
    <Card className="p-4 space-y-4 shadow-medium">
      {/* Modality */}
      {clause.modality && (
        <div>
          <Badge
            variant="outline"
            className={`${modalityColors[clause.modality] || ""} font-semibold`}
          >
            {clause.modality}
          </Badge>
        </div>
      )}

      {/* Core Structure */}
      <div className="space-y-2 text-sm">
        {actor && (
          <div className="flex gap-2">
            <span className="text-muted-foreground min-w-20">Actor:</span>
            <span className="font-medium">{actor}</span>
          </div>
        )}
        {clause.action_verb && (
          <div className="flex gap-2">
            <span className="text-muted-foreground min-w-20">Action:</span>
            <span className="font-medium">{clause.action_verb}</span>
          </div>
        )}
        {clause.object && (
          <div className="flex gap-2">
            <span className="text-muted-foreground min-w-20">Object:</span>
            <span className="font-medium">{clause.object}</span>
          </div>
        )}
        {clause.condition && (
          <div className="flex gap-2">
            <span className="text-muted-foreground min-w-20">Condition:</span>
            <span className="text-muted-foreground italic">{clause.condition}</span>
          </div>
        )}
      </div>

      {/* Formula */}
      {clause.formulas?.deontic && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Deontic Formula</p>
          <code className="block text-xs font-mono bg-muted p-3 rounded break-all">
            {clause.formulas.deontic}
          </code>
        </div>
      )}

      {/* Confidence */}
      {clause.confidence && (
        <div className="pt-3 border-t space-y-3">
          <p className="text-xs text-muted-foreground">Confidence Metrics</p>
          {clause.confidence.classify !== undefined && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Classify</span>
                <span className="font-medium">
                  {Math.round((clause.confidence.classify || 0) * 100)}%
                </span>
              </div>
              <Progress value={(clause.confidence.classify || 0) * 100} className="h-1.5" />
            </div>
          )}
          {clause.confidence.formalize !== undefined && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Formalize</span>
                <span className="font-medium">
                  {Math.round((clause.confidence.formalize || 0) * 100)}%
                </span>
              </div>
              <Progress value={(clause.confidence.formalize || 0) * 100} className="h-1.5" />
            </div>
          )}
          {clause.confidence.validate !== undefined && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Validate</span>
                <span className="font-medium">
                  {Math.round((clause.confidence.validate || 0) * 100)}%
                </span>
              </div>
              <Progress value={(clause.confidence.validate || 0) * 100} className="h-1.5" />
            </div>
          )}
        </div>
      )}

      {/* Ambiguities */}
      {clause.ambiguity && clause.ambiguity.length > 0 && (
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-status-refine" />
            <p className="text-xs font-medium">Ambiguities Detected</p>
          </div>
          <div className="space-y-2">
            {clause.ambiguity.map((amb, idx) => (
              <div key={idx} className="text-xs bg-muted p-2 rounded">
                <span className="font-medium">{amb.type}:</span>{" "}
                <span className="text-muted-foreground">{amb.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ClauseDisplay;
