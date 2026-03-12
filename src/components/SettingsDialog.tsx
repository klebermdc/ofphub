import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, TestTube, Trash2, Eye, EyeOff, Loader2, Bot, Plug } from 'lucide-react';
import { useApiIntegrations } from '@/hooks/useApiIntegrations';
import { useOpenClaw } from '@/hooks/useOpenClaw';
import { Badge } from '@/components/ui/badge';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export function SettingsDialog({ open, onOpenChange, userId }: SettingsDialogProps) {
  const { saveIntegration, deleteIntegration, testConnection, getAccountingIntegration, isLoading } = useApiIntegrations(userId);
  const { listAgents, isLoading: openclawLoading } = useOpenClaw();
  
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [openclawConnected, setOpenclawConnected] = useState(false);
  const [testingOpenClaw, setTestingOpenClaw] = useState(false);

  useEffect(() => {
    if (open) {
      const existing = getAccountingIntegration();
      if (existing) {
        setApiUrl(existing.api_url);
        setApiKey(existing.api_key);
      } else {
        setApiUrl('');
        setApiKey('');
      }
    }
  }, [open]);

  const handleSave = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) return;
    setSaving(true);
    await saveIntegration('accounting', apiUrl.trim(), apiKey.trim());
    setSaving(false);
  };

  const handleTest = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) return;
    setTesting(true);
    await testConnection(apiUrl.trim(), apiKey.trim());
    setTesting(false);
  };

  const handleDelete = async () => {
    const existing = getAccountingIntegration();
    if (existing) {
      await deleteIntegration(existing.id);
      setApiUrl('');
      setApiKey('');
    }
  };

  const handleTestOpenClaw = async () => {
    setTestingOpenClaw(true);
    const result = await listAgents();
    if (result) {
      setOpenclawConnected(true);
    }
    setTestingOpenClaw(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="accounting" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accounting" className="gap-1.5 text-xs">
              <Plug className="h-3.5 w-3.5" />
              Contabilidade
            </TabsTrigger>
            <TabsTrigger value="openclaw" className="gap-1.5 text-xs">
              <Bot className="h-3.5 w-3.5" />
              OpenClaw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounting" className="space-y-6 py-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">API de Contabilidade Externa</h3>
              <p className="text-xs text-muted-foreground">
                Configure o acesso à API do seu sistema de contabilidade para importar custos operacionais automaticamente.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">URL da API</Label>
                <Input
                  id="api-url"
                  placeholder="https://api.seuapp.com/v1"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">Chave de API (API Key)</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    placeholder="Sua chave de API"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={handleSave} disabled={saving || !apiUrl.trim() || !apiKey.trim()} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
              <Button variant="outline" onClick={handleTest} disabled={testing || !apiUrl.trim() || !apiKey.trim()} className="gap-2">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Testar Conexão
              </Button>
              {getAccountingIntegration() && (
                <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2 ml-auto">
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="openclaw" className="space-y-6 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">OpenClaw - Agente Autônomo</h3>
                <Badge variant={openclawConnected ? 'default' : 'secondary'} className="text-[10px]">
                  {openclawConnected ? 'Conectado' : 'Não conectado'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Conecte ao OpenClaw para automatizar tarefas como geração de relatórios, análise de dados e mais.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Automações Disponíveis</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Gerar relatórios de vendas automáticos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Análise inteligente de desempenho de vendedores
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Previsão de metas e tendências
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Alertas automáticos de performance
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Status da Conexão</h4>
                <p className="text-xs text-muted-foreground">
                  A API Key do OpenClaw é configurada de forma segura no backend. 
                  Após configurar, use o botão abaixo para testar a conexão.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleTestOpenClaw}
                disabled={testingOpenClaw}
                className="gap-2"
              >
                {testingOpenClaw ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Testar Conexão OpenClaw
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
