import { useState, useEffect, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  Panel,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { Filter, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import ClauseNode from "@/components/graph/ClauseNode";
import ActorNode from "@/components/graph/ActorNode";
import ArticleNode from "@/components/graph/ArticleNode";
import { API_ENDPOINTS } from "@/config/api";

const nodeTypes = {
  clause: ClauseNode,
  actor: ActorNode,
  article: ArticleNode,
};

interface GraphStats {
  total_clauses: number;
  total_actors: number;
  total_articles: number;
  total_edges: number;
}

const DependencyGraphInner = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filters, setFilters] = useState({
    modality: "all",
    article: "",
    actor: "",
  });
  const { toast } = useToast();

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.modality && filters.modality !== "all")
        params.append("modality", filters.modality);
      if (filters.article) params.append("article", filters.article);
      if (filters.actor) params.append("actor", filters.actor);

      const response = await fetch(
        `${API_ENDPOINTS.graph}?${params}`
      );
      if (!response.ok) throw new Error("Failed to fetch graph data");

      const data = await response.json();

      // Apply layout
      const layoutedNodes = applyLayout(data.nodes, data.edges);
      setNodes(layoutedNodes);
      setEdges(data.edges);
      setStats(data.stats);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dependency graph",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, setNodes, setEdges, toast]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const applyLayout = (nodes: Node[], edges: Edge[]) => {
    // Simple layout algorithm: organize by type
    const clauseNodes = nodes.filter((n) => n.type === "clause");
    const actorNodes = nodes.filter((n) => n.type === "actor");
    const articleNodes = nodes.filter((n) => n.type === "article");

    const layouted: Node[] = [];

    // Articles on the left
    articleNodes.forEach((node, idx) => {
      layouted.push({
        ...node,
        position: { x: 50, y: idx * 150 + 50 },
      });
    });

    // Clauses in the middle
    clauseNodes.forEach((node, idx) => {
      const col = Math.floor(idx / 5);
      const row = idx % 5;
      layouted.push({
        ...node,
        position: { x: 400 + col * 350, y: row * 200 + 50 },
      });
    });

    // Actors on the right
    actorNodes.forEach((node, idx) => {
      layouted.push({
        ...node,
        position: { x: 1200, y: idx * 150 + 50 },
      });
    });

    return layouted;
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h1 className="text-xl font-semibold">Dependency Graph</h1>
            {stats && (
              <div className="flex gap-2 ml-4">
                <Badge variant="outline">
                  {stats.total_clauses} clauses
                </Badge>
                <Badge variant="outline">{stats.total_actors} actors</Badge>
                <Badge variant="outline">
                  {stats.total_articles} articles
                </Badge>
              </div>
            )}
          </div>
          <Navigation />
        </div>
      </header>

      {/* Filters */}
      <div className="border-b bg-card px-6 py-3">
        <div className="flex gap-4 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />

          <Select
            value={filters.modality}
            onValueChange={(value) =>
              setFilters({ ...filters, modality: value })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Modalities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modalities</SelectItem>
              <SelectItem value="OBLIGATION">Obligation</SelectItem>
              <SelectItem value="PROHIBITION">Prohibition</SelectItem>
              <SelectItem value="PERMISSION">Permission</SelectItem>
              <SelectItem value="EXEMPTION">Exemption</SelectItem>
              <SelectItem value="RECOMMENDATION">Recommendation</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={fetchGraph}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Graph */}
      <div className="flex-1 relative">
        {loading && nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading graph...</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "clause") {
                  const modality = node.data?.modality;
                  if (modality === "OBLIGATION") return "#3b82f6";
                  if (modality === "PROHIBITION") return "#ef4444";
                  if (modality === "PERMISSION") return "#10b981";
                  if (modality === "EXEMPTION") return "#f59e0b";
                  return "#6b7280";
                }
                if (node.type === "actor") return "#8b5cf6";
                if (node.type === "article") return "#ec4899";
                return "#6b7280";
              }}
              style={{
                background: "hsl(var(--card))",
              }}
            />

            <Panel position="top-left" className="bg-card p-3 rounded-lg shadow-lg border">
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Legend</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span>Obligation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span>Prohibition</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-status-ok" />
                      <span>Permission</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span>Actor</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-pink-500" />
                      <span>Article</span>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        )}

        {/* Detail Panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-2rem)] overflow-auto">
            <Card className="p-4 shadow-xl">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className="capitalize">
                    {selectedNode.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedNode(null)}
                    className="h-6 w-6 p-0"
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  {selectedNode.data?.label && (
                    <div>
                      <p className="text-muted-foreground text-xs">Label</p>
                      <p className="font-medium">{selectedNode.data.label}</p>
                    </div>
                  )}

                  {selectedNode.data?.modality && (
                    <div>
                      <p className="text-muted-foreground text-xs">Modality</p>
                      <Badge
                        variant="outline"
                        className={
                          selectedNode.data.modality === "OBLIGATION"
                            ? "bg-primary/10 text-primary"
                            : selectedNode.data.modality === "PROHIBITION"
                            ? "bg-destructive/10 text-destructive"
                            : selectedNode.data.modality === "PERMISSION"
                            ? "bg-status-ok/10 text-status-ok"
                            : ""
                        }
                      >
                        {selectedNode.data.modality}
                      </Badge>
                    </div>
                  )}

                  {selectedNode.data?.actor && (
                    <div>
                      <p className="text-muted-foreground text-xs">Actor</p>
                      <p>{selectedNode.data.actor}</p>
                    </div>
                  )}

                  {selectedNode.data?.object && (
                    <div>
                      <p className="text-muted-foreground text-xs">Object</p>
                      <p>{selectedNode.data.object}</p>
                    </div>
                  )}

                  {selectedNode.data?.condition && (
                    <div>
                      <p className="text-muted-foreground text-xs">Condition</p>
                      <p className="text-xs italic">{selectedNode.data.condition}</p>
                    </div>
                  )}

                  {selectedNode.data?.formula && (
                    <div>
                      <p className="text-muted-foreground text-xs">Formula</p>
                      <code className="block text-xs font-mono bg-muted p-2 rounded break-all">
                        {selectedNode.data.formula}
                      </code>
                    </div>
                  )}

                  {selectedNode.data?.text && (
                    <div>
                      <p className="text-muted-foreground text-xs">Text</p>
                      <p className="text-xs">{selectedNode.data.text}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

const DependencyGraph = () => {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner />
    </ReactFlowProvider>
  );
};

export default DependencyGraph;
