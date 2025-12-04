import { useState } from "react";
import { Users, Plus, Trash2, Link2, Megaphone } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useSalespersonAccounts, useMarketingAccounts } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

interface SalespersonAccountsDialogProps {
  userId: string | undefined;
  availableSalespeople: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function SalespersonAccountsDialog({ 
  userId, 
  availableSalespeople, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  showTrigger = true 
}: SalespersonAccountsDialogProps) {
  const { accounts, linkSalesperson, unlinkSalesperson, loadAccounts } = useSalespersonAccounts(userId);
  const { accounts: marketingAccounts, linkMarketing, unlinkMarketing } = useMarketingAccounts(userId);
  const [internalOpen, setInternalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState("");
  const [isLinkingMarketing, setIsLinkingMarketing] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

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
      // Find user by email using security definer function
      const { data: userId, error: findError } = await supabase
        .rpc('find_user_by_email', { _email: email });

      if (findError || !userId) {
        toast({
          title: "Usuário não encontrado",
          description: "Esse email não está cadastrado. O vendedor precisa criar uma conta primeiro.",
          variant: "destructive",
        });
        setIsLinking(false);
        return;
      }

      const success = await linkSalesperson(userId, selectedName);

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

  const handleLinkMarketing = async () => {
    if (!marketingEmail) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o email do usuário de marketing.",
        variant: "destructive",
      });
      return;
    }

    setIsLinkingMarketing(true);

    try {
      const { data: targetUserId, error: findError } = await supabase
        .rpc('find_user_by_email', { _email: marketingEmail });

      if (findError || !targetUserId) {
        toast({
          title: "Usuário não encontrado",
          description: "Esse email não está cadastrado. O usuário precisa criar uma conta primeiro.",
          variant: "destructive",
        });
        setIsLinkingMarketing(false);
        return;
      }

      const success = await linkMarketing(targetUserId);

      if (success) {
        toast({
          title: "Marketing vinculado!",
          description: "Usuário de marketing foi vinculado com sucesso.",
        });
        setMarketingEmail("");
      } else {
        toast({
          title: "Erro ao vincular",
          description: "Não foi possível vincular o usuário de marketing.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error linking marketing:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao vincular o usuário de marketing.",
        variant: "destructive",
      });
    }

    setIsLinkingMarketing(false);
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

  const handleUnlinkMarketing = async (marketingUserId: string) => {
    const success = await unlinkMarketing(marketingUserId);
    
    if (success) {
      toast({
        title: "Marketing desvinculado",
        description: "Usuário de marketing foi desvinculado do sistema.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível desvincular o usuário de marketing.",
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
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Acesso de Usuários</DialogTitle>
          <DialogDescription>
            Vincule contas de vendedores e marketing para que possam acessar o sistema.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="vendedores" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
          </TabsList>

          <TabsContent value="vendedores" className="space-y-6 mt-4">
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
          </TabsContent>

          <TabsContent value="marketing" className="space-y-6 mt-4">
            {/* Add new marketing user */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Vincular Usuário de Marketing
              </h4>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marketing-email">Email do usuário</Label>
                  <Input
                    id="marketing-email"
                    type="email"
                    placeholder="marketing@email.com"
                    value={marketingEmail}
                    onChange={(e) => setMarketingEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    O usuário precisa criar uma conta com este email primeiro.
                  </p>
                </div>

                <Button 
                  onClick={handleLinkMarketing} 
                  disabled={isLinkingMarketing || !marketingEmail}
                  className="w-full"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {isLinkingMarketing ? "Vinculando..." : "Vincular Marketing"}
                </Button>
              </div>
            </div>

            {/* Linked marketing users */}
            <div className="space-y-3">
              <h4 className="font-medium">Usuários de Marketing Vinculados</h4>
              
              {marketingAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum usuário de marketing vinculado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {marketingAccounts.map(account => (
                    <div 
                      key={account.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Marketing</p>
                          <p className="text-xs text-muted-foreground">
                            Vinculado em {new Date(account.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkMarketing(account.user_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
