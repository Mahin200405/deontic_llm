import { useState, useEffect } from "react";
import { Search, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import ClauseDrawer from "@/components/ClauseDrawer";

interface Clause {
  id: string;
  article_id?: string;
  modality?: string;
  actor?: string;
  actor_canonical?: string;
  object?: string;
  formulas?: { deontic?: string };
  updated_at?: number;
  text?: string;
}

const modalityColors: Record<string, string> = {
  OBLIGATION: "bg-primary/10 text-primary border-primary/20",
  PROHIBITION: "bg-destructive/10 text-destructive border-destructive/20",
  PERMISSION: "bg-status-ok/10 text-status-ok border-status-ok/20",
  EXEMPTION: "bg-status-refine/10 text-status-refine border-status-refine/20",
  RECOMMENDATION: "bg-accent-foreground/10 text-accent-foreground border-accent-foreground/20",
};

const Clauses = () => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    modality: "",
    article: "",
    search: "",
  });
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClauses();
  }, [filters]);

  const fetchClauses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.modality) params.append("modality", filters.modality);
      if (filters.article) params.append("article", filters.article);
      if (filters.search) params.append("search", filters.search);

      const response = await fetch(`http://localhost:8000/api/clauses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch clauses");

      const data = await response.json();
      setClauses(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load clauses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.modality) params.append("modality", filters.modality);
      if (filters.article) params.append("article", filters.article);

      const response = await fetch(`http://localhost:8000/api/clauses/export?${params}`);
      if (!response.ok) throw new Error("Export failed");

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clauses_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Exported ${data.data.length} clauses`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export clauses",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <h1 className="text-xl font-semibold">Clauses Library</h1>
          </div>
          <div className="flex items-center gap-4">
            <Navigation />
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by actor..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select
            value={filters.modality}
            onValueChange={(value) => setFilters({ ...filters, modality: value })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Modalities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Modalities</SelectItem>
              <SelectItem value="OBLIGATION">Obligation</SelectItem>
              <SelectItem value="PROHIBITION">Prohibition</SelectItem>
              <SelectItem value="PERMISSION">Permission</SelectItem>
              <SelectItem value="EXEMPTION">Exemption</SelectItem>
              <SelectItem value="RECOMMENDATION">Recommendation</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Article ID..."
            value={filters.article}
            onChange={(e) => setFilters({ ...filters, article: e.target.value })}
            className="w-36"
          />
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Article</TableHead>
                <TableHead className="w-32">Modality</TableHead>
                <TableHead className="w-48">Actor</TableHead>
                <TableHead className="flex-1">Object</TableHead>
                <TableHead className="w-64">Formula</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-muted-foreground">Loading clauses...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : clauses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">No clauses found</p>
                  </TableCell>
                </TableRow>
              ) : (
                clauses.map((clause) => (
                  <TableRow
                    key={clause.id}
                    className="cursor-pointer hover:bg-surface-hover"
                    onClick={() => setSelectedClause(clause)}
                  >
                    <TableCell className="font-medium">
                      {clause.article_id || "—"}
                    </TableCell>
                    <TableCell>
                      {clause.modality ? (
                        <Badge
                          variant="outline"
                          className={modalityColors[clause.modality] || ""}
                        >
                          {clause.modality}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {clause.actor_canonical || clause.actor || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {clause.object || "—"}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {clause.formulas?.deontic?.slice(0, 40) || "—"}
                        {clause.formulas?.deontic && clause.formulas.deontic.length > 40
                          ? "..."
                          : ""}
                      </code>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* Drawer */}
      <ClauseDrawer
        clause={selectedClause}
        open={!!selectedClause}
        onClose={() => setSelectedClause(null)}
        onSave={fetchClauses}
      />
    </div>
  );
};

export default Clauses;
