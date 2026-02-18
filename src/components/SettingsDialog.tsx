import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, TestTube, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useApiIntegrations } from '@/hooks/useApiIntegrations';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export function SettingsDialog({ open, onOpenChange, userId }: SettingsDialogProps) {
  const { saveIntegration, deleteIntegration, testConnection, getAccountingIntegration, isLoading } = useApiIntegrations(userId);
  
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
