import { useState } from "react";
import { Users, Plus, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useSalespersonAccounts } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

interface SalespersonAccountsDialogProps {
  userId: string | undefined;
  availableSalespeople: string[];
}

export function SalespersonAccountsDialog({ userId, availableSalespeople }: SalespersonAccountsDialogProps) {
  const { accounts, linkSalesperson, unlinkSalesperson, loadAccounts } = useSalespersonAccounts(userId);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const handleLink = async () => {
    if (!email || !selectedName) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe o email e selecione o vendedor.",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);

    try {
      // Find user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        toast({
          title: "Usuário não encontrado",
          description: "Esse email não está cadastrado. O vendedor precisa criar uma conta primeiro.",
          variant: "destructive",
        });
        setIsLinking(false);
        return;
      }

      const success = await linkSalesperson(profile.id, selectedName);

      if (success) {
        toast({
          title: "Vendedor vinculado!",
          description: `${selectedName} foi vinculado com sucesso.`,
        });
        setEmail("");
        setSelectedName("");
      } else {
        toast({
          title: "Erro ao vincular",
          description: "Não foi possível vincular o vendedor.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error linking salesperson:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao vincular o vendedor.",
        variant: "destructive",
      });
    }

    setIsLinking(false);
  };

  const handleUnlink = async (salespersonUserId: string, name: string) => {
    const success = await unlinkSalesperson(salespersonUserId);
    
    if (success) {
      toast({
        title: "Vendedor desvinculado",
        description: `${name} foi desvinculado do sistema.`,
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível desvincular o vendedor.",
        variant: "destructive",
      });
    }
  };

  // Filter out already linked salespeople
  const linkedNames = accounts.map(a => a.salesperson_name?.toLowerCase());
  const availableNames = availableSalespeople.filter(
    name => !linkedNames.includes(name.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Vendedores
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Acesso de Vendedores</DialogTitle>
          <DialogDescription>
            Vincule contas de vendedores para que possam acessar suas vendas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new salesperson */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Vincular Novo Vendedor
            </h4>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do vendedor</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vendedor@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  O vendedor precisa criar uma conta com este email primeiro.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Nome do vendedor na planilha</Label>
                <Select value={selectedName} onValueChange={setSelectedName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNames.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Todos os vendedores já estão vinculados
                      </SelectItem>
                    ) : (
                      availableNames.map(name => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleLink} 
                disabled={isLinking || !email || !selectedName}
                className="w-full"
              >
                <Link2 className="h-4 w-4 mr-2" />
                {isLinking ? "Vinculando..." : "Vincular Vendedor"}
              </Button>
            </div>
          </div>

          {/* Linked salespeople */}
          <div className="space-y-3">
            <h4 className="font-medium">Vendedores Vinculados</h4>
            
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum vendedor vinculado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {accounts.map(account => (
                  <div 
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{account.salesperson_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Vinculado em {new Date(account.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(account.user_id, account.salesperson_name || '')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
