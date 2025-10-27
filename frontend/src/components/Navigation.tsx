import { Link, useLocation } from "react-router-dom";
import { MessageSquare, FileText, Network } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex items-center gap-2">
      <Link to="/chat">
        <Button
          variant={isActive("/chat") ? "default" : "ghost"}
          size="sm"
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
      </Link>
      <Link to="/graph">
        <Button
          variant={isActive("/graph") ? "default" : "ghost"}
          size="sm"
          className="gap-2"
        >
          <Network className="h-4 w-4" />
          Graph
        </Button>
      </Link>
      <Link to="/clauses">
        <Button
          variant={isActive("/clauses") ? "default" : "ghost"}
          size="sm"
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Clauses
        </Button>
      </Link>
    </nav>
  );
};

export default Navigation;
