import { useState } from "react";
import { LogOut, User, Settings, Users, Sun, Moon, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { SalespersonAccountsDialog } from "./SalespersonAccountsDialog";
import { SettingsDialog } from "./SettingsDialog";
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
  const { theme, setTheme } = useTheme();
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const isDark = theme === "dark";

  return (
    <>
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <img 
            src="/images/logo-branco.png" 
            alt="Orlando Fast Pass" 
            className={`h-8 sm:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity ${!isDark ? 'invert' : ''}`}
            onClick={() => navigate("/")}
          />
          <div className="hidden sm:block">
            <h1 className="font-semibold text-base sm:text-lg">Hub de Gestão</h1>
            <p className="text-xs text-muted-foreground">Orlando Fast Pass</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-warning" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
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
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setSettingsOpen(true)}>
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
    </header>
      <SalespersonAccountsDialog 
        userId={user?.id}
        open={usersDialogOpen} 
        onOpenChange={setUsersDialogOpen}
        availableSalespeople={availableSalespeople}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} userId={user?.id} />
    </>
  );
}