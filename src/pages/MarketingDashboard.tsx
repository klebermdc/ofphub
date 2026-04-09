import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Megaphone, LogOut, User, Settings, Upload, FileText, Download, Trash2, File } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketingAdsTab } from "@/components/MarketingAdsTab";
import { MarketingTab } from "@/components/MarketingTab";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useMarketingCosts } from "@/hooks/useMarketingCosts";
import { useMarketingFiles } from "@/hooks/useMarketingFiles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSheetData } from "@/contexts/SheetDataContext";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MarketingDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const initialTab = searchParams.get("tab") === "historico" ? "historico" : "trafego";
  
  const { salesReps, isLoading: sheetLoading } = useSheetData();
  const { costs, isLoading: costsLoading, saveCost, getCostForMonth } = useMarketingCosts(user?.id, true);
  const { files, isLoading: filesLoading, uploadFile, deleteFile, downloadFile } = useMarketingFiles(user?.id);
  
  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState<string>("NF Fornecedor");
  const [isUploading, setIsUploading] = useState(false);
  
  const fileCategories = [
    "NF Fornecedor",
    "NF Google",
    "NF Meta",
    "Comprovante",
    "Contrato",
    "Outro",
  ];

  // Redirect if not authorized for marketing dashboard
  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (role === 'salesperson') {
        navigate("/vendedor");
      }
    }
  }, [user, loading, role, roleLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    await uploadFile(file, uploadCategory);
    setIsUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading || roleLoading || costsLoading || filesLoading || sheetLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 glass rounded-xl max-w-md">
          <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Conta Pendente</h2>
          <p className="text-muted-foreground mb-4">
            Sua conta ainda não foi vinculada pelo gestor. Entre em contato com seu gerente para ativar o acesso.
          </p>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'var(--gradient-glow)',
        }}
      />
      
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo-branco.png" 
              alt="Orlando Fast Pass" 
              className={`h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity ${theme !== 'dark' ? 'invert' : ''}`}
              onClick={() => navigate("/")}
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
                    <span className="font-medium">{user?.user_metadata?.full_name || 'Marketing'}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
      </header>
      
      <main className="container mx-auto px-6 py-6 relative space-y-6">
        <Tabs defaultValue={initialTab}>
          <TabsList className="mb-2">
            <TabsTrigger value="historico">📊 Histórico</TabsTrigger>
            <TabsTrigger value="trafego">🚀 Tráfego Pago</TabsTrigger>
          </TabsList>

          <TabsContent value="trafego">
            <MarketingAdsTab />
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <MarketingTab
              costs={costs}
              onSave={saveCost}
              getCostForMonth={getCostForMonth}
              salesReps={salesReps}
            />

            {/* File Upload Section */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Notas Fiscais de Fornecedores</h3>
              
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {fileCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                />
                
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Enviando..." : "Upload de Arquivo"}
                </Button>
              </div>

              {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum arquivo enviado ainda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <File className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{file.file_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{file.category || '-'}</TableCell>
                          <TableCell>{formatFileSize(file.file_size)}</TableCell>
                          <TableCell>
                            {new Date(file.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => downloadFile(file.file_path, file.file_name)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteFile(file.id, file.file_path)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MarketingDashboard;
