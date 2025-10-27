import { useState, useEffect } from "react";
import { Circle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { API_ENDPOINTS } from "@/config/api";

const StatusIndicator = () => {
  const [status, setStatus] = useState({
    mongo: false,
    pinecone: false,
    openai: false,
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.status);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Status check failed:", error);
    }
  };

  const getStatusColor = (isOk: boolean) =>
    isOk ? "text-status-ok" : "text-status-review";

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1.5">
              <Circle
                className={`h-2 w-2 fill-current ${getStatusColor(status.mongo)}`}
              />
              <span className="text-xs text-muted-foreground">Mongo</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>MongoDB: {status.mongo ? "Connected" : "Disconnected"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1.5">
              <Circle
                className={`h-2 w-2 fill-current ${getStatusColor(status.pinecone)}`}
              />
              <span className="text-xs text-muted-foreground">Pinecone</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pinecone: {status.pinecone ? "Connected" : "Disconnected"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1.5">
              <Circle
                className={`h-2 w-2 fill-current ${getStatusColor(status.openai)}`}
              />
              <span className="text-xs text-muted-foreground">OpenAI</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>OpenAI: {status.openai ? "Connected" : "Disconnected"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default StatusIndicator;
