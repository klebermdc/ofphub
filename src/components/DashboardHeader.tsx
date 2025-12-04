import { useState } from "react";
import { LogOut, User, Settings, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SalespersonAccountsDialog } from "./SalespersonAccountsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  availableSalespeople?: string[];
}

export function DashboardHeader({ availableSalespeople = [] }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="/images/logo-ofp.png" 
            alt="Orlando Fast Pass" 
            className="h-10"
          />
          <div className="hidden md:block">
            <h1 className="font-semibold text-lg">Hub de Gestão</h1>
            <p className="text-xs text-muted-foreground">Orlando Fast Pass</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="hidden md:inline text-sm">
                  {user?.email?.split('@')[0]}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.user_metadata?.full_name || 'Usuário'}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 cursor-pointer"
                onClick={() => setUsersDialogOpen(true)}
              >
                <Users className="h-4 w-4" />
                Gerenciar Usuários
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive cursor-pointer">
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialog de Usuários */}
      <SalespersonAccountsDialog 
        userId={user?.id} 
        availableSalespeople={availableSalespeople}
        open={usersDialogOpen}
        onOpenChange={setUsersDialogOpen}
        showTrigger={false}
      />
    </header>
  );
}