import { useState } from "react";
import { FileSpreadsheet, Link, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LeadsSheetDialogProps {
  onConnect: (url: string) => Promise<void>;
  currentUrl?: string;
  onDisconnect?: () => void;
  isLoading?: boolean;
}

export function LeadsSheetDialog({ 
  onConnect, 
  currentUrl, 
  onDisconnect,
  isLoading 
}: LeadsSheetDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(currentUrl || '');

  const handleConnect = async () => {
    if (!url.includes('docs.google.com/spreadsheets')) {
      return;
    }
    
    await onConnect(url);
    setOpen(false);
  };

  const isConnected = !!currentUrl;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isConnected ? "outline" : "default"} 
          size="sm" 
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isConnected ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          {isConnected ? "Atualizar Leads" : "Conectar Planilha de Leads"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Planilha de Leads
          </DialogTitle>
          <DialogDescription>
            Conecte sua planilha do Google Sheets com dados de leads para análise por canal.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">URL da Planilha</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="pl-10"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A planilha deve estar compartilhada como "Qualquer pessoa com o link pode visualizar"
            </p>
          </div>

          {isConnected && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-success">Planilha conectada</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                    {currentUrl}
                  </p>
                </div>
                {onDisconnect && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      onDisconnect();
                      setUrl('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
            <p className="text-sm font-medium text-info mb-1">Colunas esperadas:</p>
            <p className="text-xs text-muted-foreground">
              Telefone, Nome, Sobrenome, Email, Medium, Source, Campaign, Content, Term, Page Referrer
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConnect} 
            disabled={!url.includes('docs.google.com/spreadsheets') || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              'Conectar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
