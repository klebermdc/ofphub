import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, UserPlus, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Erro no login",
            description: error.message === "Invalid login credentials" 
              ? "Email ou senha incorretos" 
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Bem-vindo!",
            description: "Login realizado com sucesso.",
          });
          navigate("/");
        }
      } else {
        if (!fullName.trim()) {
          toast({
            title: "Nome obrigatório",
            description: "Por favor, informe seu nome completo.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Email já cadastrado",
              description: "Este email já possui uma conta. Tente fazer login.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro no cadastro",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Conta criada!",
            description: "Você já pode acessar o sistema.",
          });
          navigate("/");
        }
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'var(--gradient-glow)',
        }}
      />
      
      <div className="w-full max-w-md relative">
        <div className="text-center mb-6 sm:mb-8">
          <img 
            src="/images/logo-branco.png" 
            alt="Orlando Fast Pass" 
            className={`h-12 sm:h-16 mx-auto mb-3 sm:mb-4 ${theme !== 'dark' ? 'invert' : ''}`}
          />
          <h1 className="text-xl sm:text-2xl font-bold">
            <span className="gradient-text">Orlando Fast Pass</span>
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Hub de Gestão</p>
        </div>

        <div className="glass rounded-xl p-6 sm:p-8">
          <div className="flex mb-4 sm:mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-center font-medium transition-colors text-sm sm:text-base ${
                isLogin 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground border-b border-border"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-center font-medium transition-colors text-sm sm:text-base ${
                !isLogin 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground border-b border-border"
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {!isLogin && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="fullName" className="text-sm">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="h-10 sm:h-11"
                />
              </div>
            )}

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 sm:h-11"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-sm">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10 sm:h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 h-10 sm:h-11 mt-2" disabled={isLoading}>
              {isLoading ? (
                "Carregando..."
              ) : isLogin ? (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Criar Conta
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
