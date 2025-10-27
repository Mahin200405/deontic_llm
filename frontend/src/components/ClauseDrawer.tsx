import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";

interface ClauseDrawerProps {
  clause: any;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ClauseDrawer = ({ clause, open, onClose, onSave }: ClauseDrawerProps) => {
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (clause) {
      setFormData({
        actor: clause.actor || "",
        actor_canonical: clause.actor_canonical || "",
        object: clause.object || "",
        condition: clause.condition || "",
        deontic_formula: clause.formulas?.deontic || "",
      });
    }
  }, [clause]);

  const handleSave = async () => {
    if (!clause?.id) return;

    setSaving(true);
    try {
      const response = await fetch(API_ENDPOINTS.clause(clause.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: formData.actor,
          actor_canonical: formData.actor_canonical,
          object: formData.object,
          condition: formData.condition,
          formulas: { deontic: formData.deontic_formula },
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      toast({
        title: "Saved",
        description: "Clause updated successfully",
      });

      onSave();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save clause",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!clause) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Clause Details</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4 mt-6">
          <div className="space-y-6">
            {/* Original Text */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Original Text</Label>
              <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/50 text-sm leading-relaxed">
                {clause.text}
              </blockquote>
            </div>

            {/* Article & Modality */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-sm font-semibold mb-2 block">Article</Label>
                <Badge variant="secondary">{clause.article_id || "—"}</Badge>
              </div>
              <div className="flex-1">
                <Label className="text-sm font-semibold mb-2 block">Modality</Label>
                <Badge variant="outline">{clause.modality || "—"}</Badge>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="actor">Actor</Label>
                <Input
                  id="actor"
                  value={formData.actor || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, actor: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="actor_canonical">Canonical Actor</Label>
                <Input
                  id="actor_canonical"
                  value={formData.actor_canonical || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, actor_canonical: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="object">Object</Label>
                <Input
                  id="object"
                  value={formData.object || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, object: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="condition">Condition</Label>
                <Textarea
                  id="condition"
                  value={formData.condition || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="formula">Deontic Formula</Label>
                <Textarea
                  id="formula"
                  value={formData.deontic_formula || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, deontic_formula: e.target.value })
                  }
                  className="font-mono text-xs"
                  rows={3}
                />
              </div>
            </div>

            {/* Provenance */}
            {clause.provenance && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">Provenance</Label>
                <div className="bg-muted/50 p-3 rounded text-xs space-y-2">
                  {clause.provenance.source_uri && (
                    <div>
                      <span className="font-medium">Source:</span>{" "}
                      {clause.provenance.source_uri}
                    </div>
                  )}
                  {clause.provenance.xref_links &&
                    clause.provenance.xref_links.length > 0 && (
                      <div>
                        <span className="font-medium">Cross-refs:</span>{" "}
                        {clause.provenance.xref_links
                          .map((x: any) => x.target)
                          .join(", ")}
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ClauseDrawer;
