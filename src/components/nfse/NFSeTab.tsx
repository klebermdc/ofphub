import { useState } from "react";
import { FileText, Send, Search, X, Loader2, Building2, User, Mail, MapPin, Receipt, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TomadorData {
  cpfCnpj: string;
  razaoSocial: string;
  email: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
}

interface ServicoData {
  discriminacao: string;
  valorServico: number;
  codigoServico: string;
  aliquota: number;
}

export function NFSeTab() {
  const [activeTab, setActiveTab] = useState("emitir");
  const [isLoading, setIsLoading] = useState(false);
  const [ambiente, setAmbiente] = useState<"homologacao" | "producao">("homologacao");
  
  // Emissão
  const [tomador, setTomador] = useState<TomadorData>({
    cpfCnpj: "",
    razaoSocial: "",
    email: "",
    endereco: {
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "São Paulo",
      uf: "SP",
      cep: ""
    }
  });
  
  const [servico, setServico] = useState<ServicoData>({
    discriminacao: "Comissão",
    valorServico: 0,
    codigoServico: "07109", // Agenciamento de turismo (conforme modelo)
    aliquota: 0 // Simples Nacional - sem alíquota destacada
  });
  
  // Consulta
  const [numeroNfseConsulta, setNumeroNfseConsulta] = useState("");
  const [resultadoConsulta, setResultadoConsulta] = useState<any>(null);
  
  // Cancelamento
  const [numeroNfseCancelamento, setNumeroNfseCancelamento] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleEmitir = async () => {
    if (!tomador.cpfCnpj || !tomador.razaoSocial || !servico.discriminacao || servico.valorServico <= 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios para emitir a NFS-e.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nfse-sp', {
        body: {
          action: 'emitir',
          ambiente,
          servico,
          tomador
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "RPS gerado",
          description: `RPS ${data.data.rps.numero} gerado com sucesso. ${data.data.message}`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({
        title: "Erro ao emitir",
        description: err.message || "Não foi possível emitir a NFS-e.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleConsultar = async () => {
    if (!numeroNfseConsulta) {
      toast({
        title: "Número obrigatório",
        description: "Informe o número da NFS-e para consultar.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nfse-sp', {
        body: {
          action: 'consultar',
          ambiente,
          numeroNfse: numeroNfseConsulta
        }
      });

      if (error) throw error;

      setResultadoConsulta(data.data);
      toast({
        title: "Consulta realizada",
        description: data.data.message,
      });
    } catch (err: any) {
      toast({
        title: "Erro na consulta",
        description: err.message || "Não foi possível consultar a NFS-e.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleCancelar = async () => {
    if (!numeroNfseCancelamento || !motivoCancelamento) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe o número da NFS-e e o motivo do cancelamento.",
        variant: "destructive"
      });
      return;
    }

    if (motivoCancelamento.length < 15) {
      toast({
        title: "Motivo muito curto",
        description: "O motivo do cancelamento deve ter no mínimo 15 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nfse-sp', {
        body: {
          action: 'cancelar',
          ambiente,
          numeroNfse: numeroNfseCancelamento,
          motivoCancelamento
        }
      });

      if (error) throw error;

      toast({
        title: "Cancelamento solicitado",
        description: data.data.message,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao cancelar",
        description: err.message || "Não foi possível cancelar a NFS-e.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            NFS-e São Paulo
          </h2>
          <p className="text-muted-foreground">Emissão, consulta e cancelamento de Notas Fiscais de Serviço</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Ambiente:</Label>
          <Select value={ambiente} onValueChange={(v: "homologacao" | "producao") => setAmbiente(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="homologacao">
                <span className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">HML</Badge>
                  Homologação
                </span>
              </SelectItem>
              <SelectItem value="producao">
                <span className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">PRD</Badge>
                  Produção
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Aviso de ambiente */}
      {ambiente === "homologacao" && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span className="text-sm text-warning">Ambiente de homologação - notas emitidas não têm validade fiscal</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="emitir" className="gap-2">
            <Send className="h-4 w-4" />
            Emitir
          </TabsTrigger>
          <TabsTrigger value="consultar" className="gap-2">
            <Search className="h-4 w-4" />
            Consultar
          </TabsTrigger>
          <TabsTrigger value="cancelar" className="gap-2">
            <X className="h-4 w-4" />
            Cancelar
          </TabsTrigger>
        </TabsList>

        {/* Emissão */}
        <TabsContent value="emitir" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tomador */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Tomador
                </CardTitle>
                <CardDescription>Informações do cliente que receberá a nota</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>CPF/CNPJ *</Label>
                    <Input
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      value={tomador.cpfCnpj}
                      onChange={(e) => setTomador({ ...tomador, cpfCnpj: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Razão Social / Nome *</Label>
                    <Input
                      placeholder="Nome completo ou razão social"
                      value={tomador.razaoSocial}
                      onChange={(e) => setTomador({ ...tomador, razaoSocial: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={tomador.email}
                      onChange={(e) => setTomador({ ...tomador, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Logradouro</Label>
                      <Input
                        placeholder="Rua, Av, etc."
                        value={tomador.endereco.logradouro}
                        onChange={(e) => setTomador({ 
                          ...tomador, 
                          endereco: { ...tomador.endereco, logradouro: e.target.value } 
                        })}
                      />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input
                        placeholder="123"
                        value={tomador.endereco.numero}
                        onChange={(e) => setTomador({ 
                          ...tomador, 
                          endereco: { ...tomador.endereco, numero: e.target.value } 
                        })}
                      />
                    </div>
                    <div>
                      <Label>Bairro</Label>
                      <Input
                        placeholder="Bairro"
                        value={tomador.endereco.bairro}
                        onChange={(e) => setTomador({ 
                          ...tomador, 
                          endereco: { ...tomador.endereco, bairro: e.target.value } 
                        })}
                      />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        value={tomador.endereco.cidade}
                        onChange={(e) => setTomador({ 
                          ...tomador, 
                          endereco: { ...tomador.endereco, cidade: e.target.value } 
                        })}
                      />
                    </div>
                    <div>
                      <Label>CEP</Label>
                      <Input
                        placeholder="00000-000"
                        value={tomador.endereco.cep}
                        onChange={(e) => setTomador({ 
                          ...tomador, 
                          endereco: { ...tomador.endereco, cep: e.target.value } 
                        })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Serviço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Dados do Serviço
                </CardTitle>
                <CardDescription>Informações do serviço prestado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Código do Serviço</Label>
                  <Select 
                    value={servico.codigoServico} 
                    onValueChange={(v) => setServico({ ...servico, codigoServico: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="07109">07109 - Agenciamento de turismo, viagens, excursões, hospedagens</SelectItem>
                      <SelectItem value="07108">07108 - Passeios turísticos</SelectItem>
                      <SelectItem value="09902">09902 - Intermediação de programas de turismo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Valor do Serviço *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={servico.valorServico || ""}
                    onChange={(e) => setServico({ ...servico, valorServico: parseFloat(e.target.value) || 0 })}
                  />
                  {servico.valorServico > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(servico.valorServico)}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Alíquota ISS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={servico.aliquota}
                    onChange={(e) => setServico({ ...servico, aliquota: parseFloat(e.target.value) || 0 })}
                  />
                  {servico.valorServico > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ISS: {formatCurrency(servico.valorServico * (servico.aliquota / 100))}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Discriminação do Serviço *</Label>
                  <Textarea
                    placeholder="Descreva detalhadamente o serviço prestado..."
                    rows={5}
                    value={servico.discriminacao}
                    onChange={(e) => setServico({ ...servico, discriminacao: e.target.value })}
                  />
                </div>

                <Button 
                  className="w-full gap-2" 
                  onClick={handleEmitir}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Emitir NFS-e
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Consulta */}
        <TabsContent value="consultar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Consultar NFS-e
              </CardTitle>
              <CardDescription>Consulte uma nota fiscal pelo número</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Número da NFS-e</Label>
                  <Input
                    placeholder="Digite o número da nota"
                    value={numeroNfseConsulta}
                    onChange={(e) => setNumeroNfseConsulta(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleConsultar} disabled={isLoading} className="gap-2">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Consultar
                  </Button>
                </div>
              </div>

              {resultadoConsulta && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Resultado da Consulta:</h4>
                  <pre className="text-sm text-muted-foreground overflow-auto">
                    {JSON.stringify(resultadoConsulta, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cancelamento */}
        <TabsContent value="cancelar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <X className="h-5 w-5" />
                Cancelar NFS-e
              </CardTitle>
              <CardDescription>Solicite o cancelamento de uma nota fiscal emitida</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Atenção: O cancelamento de NFS-e é irreversível e deve ser justificado.
                </p>
              </div>

              <div>
                <Label>Número da NFS-e</Label>
                <Input
                  placeholder="Digite o número da nota a cancelar"
                  value={numeroNfseCancelamento}
                  onChange={(e) => setNumeroNfseCancelamento(e.target.value)}
                />
              </div>

              <div>
                <Label>Motivo do Cancelamento (mín. 15 caracteres)</Label>
                <Textarea
                  placeholder="Descreva o motivo do cancelamento..."
                  rows={3}
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {motivoCancelamento.length}/15 caracteres mínimos
                </p>
              </div>

              <Button 
                variant="destructive" 
                className="w-full gap-2"
                onClick={handleCancelar}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Solicitar Cancelamento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
