import { useState, useEffect } from "react";
import { Link, Loader2, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface SheetInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  compact?: boolean;
  savedUrl?: string;
}

export function SheetInput({ onAnalyze, isLoading, compact = false, savedUrl = "" }: SheetInputProps) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  // Pre-fill URL when dialog opens
  useEffect(() => {
    if (open && savedUrl) {
      setUrl(savedUrl);
    }
  }, [open, savedUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "URL necessária",
        description: "Por favor, cole o link do Google Sheet.",
        variant: "destructive",
      });
      return;
    }

    if (!url.includes("docs.google.com/spreadsheets")) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira um link válido do Google Sheets.",
        variant: "destructive",
      });
      return;
    }

    onAnalyze(url);
    setOpen(false);
  };

  if (compact) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar Planilha
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Atualizar Planilha
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              type="submit" 
              variant="gradient" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                "Analisar Planilha"
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> Certifique-se de que a planilha está compartilhada como "Qualquer pessoa com o link pode visualizar".
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Importar Planilha</h2>
          <p className="text-sm text-muted-foreground">Cole o link do Google Sheets para análise</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Link className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-12"
          />
        </div>
        <Button 
          type="submit" 
          variant="gradient" 
          size="lg" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analisando...
            </>
          ) : (
            "Analisar Planilha"
          )}
        </Button>
      </form>

      <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Dica:</strong> Certifique-se de que a planilha está compartilhada como "Qualquer pessoa com o link pode visualizar".
        </p>
      </div>
    </div>
  );
}
