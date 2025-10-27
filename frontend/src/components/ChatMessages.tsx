import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface MessageProps {
  message: {
    role: "user" | "assistant";
    content: string;
    answer?: string | object;
    citations?: string[];
    route?: string;
  };
}

const ChatMessage = ({ message }: MessageProps) => {
  const isUser = message.role === "user";

  const routeColors: Record<string, string> = {
    OK: "bg-status-ok/10 text-status-ok border-status-ok/20",
    REFINE: "bg-status-refine/10 text-status-refine border-status-refine/20",
    REVIEW: "bg-status-review/10 text-status-review border-status-review/20",
  };

  // 👇 Convert structured JSON answers into readable text
  const renderAnswer = (answer: any): string => {
    if (!answer) return "";
    if (typeof answer === "string") return answer;

    if (typeof answer === "object") {
      if (Array.isArray(answer.summary)) {
        return answer.summary.join("<br/>");
      }
      // Fallback for arbitrary objects
      return Object.entries(answer)
        .map(([key, val]) => `<b>${key}</b>: ${JSON.stringify(val)}`)
        .join("<br/>");
    }

    return String(answer);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm">⚖️</span>
        </div>
      )}

      <div className={`flex-1 ${isUser ? "max-w-2xl" : ""}`}>
        <Card
          className={`p-4 ${
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-card shadow-soft"
          }`}
        >
          <div className="space-y-3">
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: isUser
                  ? message.content
                  : renderAnswer(message.answer || message.content),
              }}
            />

            {!isUser && message.citations?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Citations:</span>
                {message.citations.map((citation, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {citation}
                  </Badge>
                ))}
              </div>
            )}

            {!isUser && message.route && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${routeColors[message.route] || ""}`}
                >
                  {message.route}
                </Badge>
              </div>
            )}
          </div>
        </Card>
      </div>

      {isUser && (
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium">You</span>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
