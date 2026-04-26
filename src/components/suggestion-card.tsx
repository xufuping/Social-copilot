import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Suggestion } from "@/lib/types";

interface SuggestionCardProps {
  suggestion: Suggestion;
  copied: boolean;
  onCopy: (suggestion: Suggestion) => void;
}

export function SuggestionCard({ suggestion, copied, onCopy }: SuggestionCardProps) {
  return (
    <Card className="gap-2">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" />
          {suggestion.style}
        </CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={() => onCopy(suggestion)}>
          {copied ? (
            <>
              <Check className="size-3.5" />
              已复制
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              复制
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="px-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{suggestion.text}</p>
      </CardContent>
    </Card>
  );
}
