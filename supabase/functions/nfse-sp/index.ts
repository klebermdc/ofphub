/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NFS-e São Paulo API URLs (Homologação e Produção)
const NFSE_SP_URL_HOMOLOG = 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx';
const NFSE_SP_URL_PROD = 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx';

interface NfseRequest {
  action: 'emitir' | 'consultar' | 'cancelar';
  ambiente?: 'homologacao' | 'producao';
  // Para emissão
  servico?: {
    discriminacao: string;
    valorServico: number;
    codigoServico: string;
    aliquota: number;
  };
  tomador?: {
    cpfCnpj: string;
    razaoSocial: string;
    endereco?: {
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      uf: string;
      cep: string;
    };
    email?: string;
  };
  // Para consulta/cancelamento
  numeroNfse?: string;
  motivoCancelamento?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cnpj = Deno.env.get('NFSE_SP_CNPJ');
    const ccm = Deno.env.get('NFSE_SP_CCM');
    const certificateBase64 = Deno.env.get('NFSE_SP_CERTIFICATE');
    const certificatePassword = Deno.env.get('NFSE_SP_CERTIFICATE_PASSWORD');

    if (!cnpj || !ccm || !certificateBase64 || !certificatePassword) {
      console.error('Credenciais NFS-e SP não configuradas');
      return new Response(
        JSON.stringify({ 
          error: 'Credenciais NFS-e SP não configuradas',
          missing: {
            cnpj: !cnpj,
            ccm: !ccm,
            certificate: !certificateBase64,
            password: !certificatePassword
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: NfseRequest = await req.json();
    const { action, ambiente = 'homologacao' } = body;

    console.log(`NFS-e SP - Ação: ${action}, Ambiente: ${ambiente}`);
    console.log(`CNPJ: ${cnpj}, CCM: ${ccm}`);

    const apiUrl = ambiente === 'producao' ? NFSE_SP_URL_PROD : NFSE_SP_URL_HOMOLOG;

    let result;

    switch (action) {
      case 'emitir':
        result = await emitirNfse(body, cnpj, ccm, apiUrl, certificateBase64, certificatePassword);
        break;
      case 'consultar':
        result = await consultarNfse(body.numeroNfse!, cnpj, ccm, apiUrl, certificateBase64, certificatePassword);
        break;
      case 'cancelar':
        result = await cancelarNfse(body.numeroNfse!, body.motivoCancelamento!, cnpj, ccm, apiUrl, certificateBase64, certificatePassword);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida. Use: emitir, consultar ou cancelar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro interno do servidor';
    console.error('Erro NFS-e SP:', err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function emitirNfse(
  request: NfseRequest,
  cnpj: string,
  ccm: string,
  apiUrl: string,
  certificateBase64: string,
  certificatePassword: string
) {
  const { servico, tomador } = request;

  if (!servico || !tomador) {
    throw new Error('Dados do serviço e tomador são obrigatórios para emissão');
  }

  // Gerar RPS (Recibo Provisório de Serviços)
  const rpsNumero = Date.now().toString().slice(-8);
  const rpsSerie = '1';
  const dataEmissao = new Date().toISOString().split('T')[0];

  // Dados do prestador (fixos conforme modelo da NF)
  const prestador = {
    cnpj: cnpj.replace(/\D/g, ''),
    ccm: ccm.replace(/\D/g, ''),
    razaoSocial: 'RENATA ALBINO GODOY DOS SANTOS',
    endereco: {
      logradouro: 'R NSRA DAS MERCES',
      numero: '628',
      complemento: 'APT 38',
      bairro: 'VILA DAS MERCES',
      cidade: '3550308', // Código IBGE São Paulo
      uf: 'SP',
      cep: '04165010'
    }
  };

  // XML para envio de RPS em lote conforme modelo NFS-e SP
  // Regime: Simples Nacional (TributacaoRPS = 'T')
  // Código Serviço: 07109 - Agenciamento de turismo
  const xmlRps = `<?xml version="1.0" encoding="UTF-8"?>
<PedidoEnvioLoteRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${prestador.cnpj}</CNPJ>
    </CPFCNPJRemetente>
    <transacao>true</transacao>
    <dtInicio>${dataEmissao}</dtInicio>
    <dtFim>${dataEmissao}</dtFim>
    <QtdRPS>1</QtdRPS>
    <ValorTotalServicos>${servico.valorServico.toFixed(2)}</ValorTotalServicos>
    <ValorTotalDeducoes>0.00</ValorTotalDeducoes>
  </Cabecalho>
  <RPS>
    <Assinatura></Assinatura>
    <ChaveRPS>
      <InscricaoPrestador>${prestador.ccm}</InscricaoPrestador>
      <SerieRPS>${rpsSerie}</SerieRPS>
      <NumeroRPS>${rpsNumero}</NumeroRPS>
    </ChaveRPS>
    <TipoRPS>RPS</TipoRPS>
    <DataEmissao>${dataEmissao}</DataEmissao>
    <StatusRPS>N</StatusRPS>
    <TributacaoRPS>T</TributacaoRPS>
    <ValorServicos>${servico.valorServico.toFixed(2)}</ValorServicos>
    <ValorDeducoes>0.00</ValorDeducoes>
    <ValorPIS>0.00</ValorPIS>
    <ValorCOFINS>0.00</ValorCOFINS>
    <ValorINSS>0.00</ValorINSS>
    <ValorIR>0.00</ValorIR>
    <ValorCSLL>0.00</ValorCSLL>
    <CodigoServico>${servico.codigoServico}</CodigoServico>
    <AliquotaServicos>${servico.aliquota}</AliquotaServicos>
    <ISSRetido>false</ISSRetido>
    <CPFCNPJTomador>
      <${tomador.cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ'}>${tomador.cpfCnpj.replace(/\D/g, '')}</${tomador.cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ'}>
    </CPFCNPJTomador>
    <RazaoSocialTomador>${tomador.razaoSocial}</RazaoSocialTomador>
    ${tomador.endereco ? `
    <EnderecoTomador>
      <TipoLogradouro>R</TipoLogradouro>
      <Logradouro>${tomador.endereco.logradouro}</Logradouro>
      <NumeroEndereco>${tomador.endereco.numero}</NumeroEndereco>
      <Bairro>${tomador.endereco.bairro}</Bairro>
      <Cidade>${getCidadeIBGE(tomador.endereco.cidade)}</Cidade>
      <UF>${tomador.endereco.uf}</UF>
      <CEP>${tomador.endereco.cep.replace(/\D/g, '')}</CEP>
    </EnderecoTomador>
    ` : ''}
    ${tomador.email ? `<EmailTomador>${tomador.email}</EmailTomador>` : ''}
    <Discriminacao>${servico.discriminacao}</Discriminacao>
  </RPS>
</PedidoEnvioLoteRPS>`;

  console.log('XML RPS gerado:', xmlRps.substring(0, 800));
  console.log('Prestador:', prestador.razaoSocial);
  console.log('Tomador:', tomador.razaoSocial);
  console.log('Valor:', servico.valorServico);
  console.log('Código Serviço:', servico.codigoServico);

  // Para implementação completa, seria necessário:
  // 1. Assinar o XML com o certificado digital A1
  // 2. Enviar via SOAP para a prefeitura
  // 3. Processar a resposta

  return {
    status: 'pending_signature',
    message: 'XML gerado conforme modelo NFS-e SP. Implementação de assinatura digital em andamento.',
    rps: {
      numero: rpsNumero,
      serie: rpsSerie,
      dataEmissao
    },
    prestador: {
      cnpj: prestador.cnpj,
      ccm: prestador.ccm,
      razaoSocial: prestador.razaoSocial
    },
    tomador: {
      cpfCnpj: tomador.cpfCnpj,
      razaoSocial: tomador.razaoSocial
    },
    servico: {
      codigo: servico.codigoServico,
      valor: servico.valorServico,
      discriminacao: servico.discriminacao
    },
    xmlGerado: true
  };
}

async function consultarNfse(
  numeroNfse: string,
  cnpj: string,
  ccm: string,
  apiUrl: string,
  certificateBase64: string,
  certificatePassword: string
) {
  const xmlConsulta = `<?xml version="1.0" encoding="UTF-8"?>
<PedidoConsultaNFe xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
  </Cabecalho>
  <Detalhe>
    <ChaveNFe>
      <InscricaoPrestador>${ccm.replace(/\D/g, '')}</InscricaoPrestador>
      <NumeroNFe>${numeroNfse}</NumeroNFe>
    </ChaveNFe>
  </Detalhe>
</PedidoConsultaNFe>`;

  console.log('XML Consulta gerado:', xmlConsulta);

  return {
    status: 'pending_implementation',
    message: 'Consulta preparada. Implementação de comunicação SOAP em andamento.',
    numeroNfse
  };
}

async function cancelarNfse(
  numeroNfse: string,
  motivo: string,
  cnpj: string,
  ccm: string,
  apiUrl: string,
  certificateBase64: string,
  certificatePassword: string
) {
  if (!motivo || motivo.length < 15) {
    throw new Error('Motivo do cancelamento deve ter no mínimo 15 caracteres');
  }

  const xmlCancelamento = `<?xml version="1.0" encoding="UTF-8"?>
<PedidoCancelamentoNFe xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${cnpj.replace(/\D/g, '')}</CNPJ>
    </CPFCNPJRemetente>
  </Cabecalho>
  <Detalhe>
    <ChaveNFe>
      <InscricaoPrestador>${ccm.replace(/\D/g, '')}</InscricaoPrestador>
      <NumeroNFe>${numeroNfse}</NumeroNFe>
    </ChaveNFe>
    <AssinaturaCancelamento></AssinaturaCancelamento>
  </Detalhe>
</PedidoCancelamentoNFe>`;

  console.log('XML Cancelamento gerado:', xmlCancelamento);

  return {
    status: 'pending_implementation',
    message: 'Cancelamento preparado. Implementação de assinatura e comunicação em andamento.',
    numeroNfse,
    motivo
  };
}

// Função auxiliar para obter código IBGE da cidade
function getCidadeIBGE(cidade: string): string {
  const cidades: Record<string, string> = {
    'São Paulo': '3550308',
    'SAO PAULO': '3550308',
    'sao paulo': '3550308',
  };
  return cidades[cidade] || '3550308'; // Default: São Paulo
}
