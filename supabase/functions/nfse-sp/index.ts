/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

// @ts-ignore
import forge from "https://esm.sh/node-forge@1.3.1?bundle";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NFS-e São Paulo API URLs
const NFSE_SP_URL_HOMOLOG = 'https://nfews.prefeitura.sp.gov.br/lotenfews.asmx';
const NFSE_SP_URL_PROD = 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx';

interface NfseRequest {
  action: 'emitir' | 'consultar' | 'cancelar';
  ambiente?: 'homologacao' | 'producao';
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
  numeroNfse?: string;
  motivoCancelamento?: string;
}

// Função para converter PFX base64 para chave privada PEM e certificado
function parsePFXCertificate(pfxBase64: string, password: string): { privateKey: string; certificate: string; certDer: string } {
  try {
    console.log('Iniciando parsing do certificado PFX...');
    console.log('Tamanho do base64 recebido:', pfxBase64.length);
    
    // Limpar base64 de possíveis espaços, quebras de linha, etc.
    const cleanBase64 = pfxBase64.replace(/[\s\r\n]+/g, '');
    console.log('Tamanho após limpeza:', cleanBase64.length);
    console.log('Primeiros 50 chars:', cleanBase64.substring(0, 50));
    
    // Decode base64 PFX
    const pfxDer = forge.util.decode64(cleanBase64);
    console.log('Bytes decodificados:', pfxDer.length);
    
    if (pfxDer.length < 100) {
      throw new Error(`Certificado muito pequeno (${pfxDer.length} bytes). Verifique se o certificado foi salvo corretamente em base64.`);
    }
    
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);
    
    // Extract private key
    const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    
    if (!keyBag || keyBag.length === 0) {
      throw new Error('Chave privada não encontrada no certificado');
    }
    
    const privateKeyForge = keyBag[0].key;
    const privateKeyPem = forge.pki.privateKeyToPem(privateKeyForge);
    
    // Extract certificate
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    
    if (!certBag || certBag.length === 0) {
      throw new Error('Certificado não encontrado no arquivo PFX');
    }
    
    const certificate = certBag[0].cert;
    const certificatePem = forge.pki.certificateToPem(certificate);
    
    // Get certificate in DER format for X509Data
    const certAsn1 = forge.pki.certificateToAsn1(certificate);
    const certDer = forge.asn1.toDer(certAsn1).getBytes();
    const certDerBase64 = forge.util.encode64(certDer);
    
    console.log('Certificado PFX parseado com sucesso');
    console.log('Subject:', certificate.subject.getField('CN')?.value);
    console.log('Issuer:', certificate.issuer.getField('CN')?.value);
    
    return {
      privateKey: privateKeyPem,
      certificate: certificatePem,
      certDer: certDerBase64
    };
  } catch (err: unknown) {
    console.error('Erro ao parsear certificado PFX:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    throw new Error(`Falha ao processar certificado: ${message}`);
  }
}

// Gera a assinatura do RPS conforme especificação NFS-e SP
function gerarAssinaturaRPS(
  ccm: string,
  rpsSerie: string,
  rpsNumero: string,
  dataEmissao: string,
  tributacao: string,
  statusRPS: string,
  issRetido: boolean,
  valorServicos: number,
  valorDeducoes: number,
  codigoServico: string,
  cpfCnpjTomador: string,
  privateKey: any
): string {
  // Formatar string de assinatura conforme manual NFS-e SP
  // InscricaoPrestador (8) + SerieRPS (5) + NumeroRPS (12) + DataEmissaoRPS (8, AAAAMMDD) + 
  // TributacaoRPS (1) + StatusRPS (1) + ISSRetido (1, S/N) + ValorServicos (15) + 
  // ValorDeducoes (15) + CodigoServico (5) + Indicador CPF/CNPJ Tomador (1) + CPF/CNPJ Tomador (14)
  
  const inscricao = ccm.replace(/\D/g, '').padStart(8, '0');
  const serie = rpsSerie.padEnd(5, ' ');
  const numero = rpsNumero.padStart(12, '0');
  const data = dataEmissao.replace(/-/g, ''); // AAAAMMDD
  const trib = tributacao.charAt(0);
  const status = statusRPS.charAt(0);
  const iss = issRetido ? 'S' : 'N';
  const valorServ = Math.round(valorServicos * 100).toString().padStart(15, '0');
  const valorDed = Math.round(valorDeducoes * 100).toString().padStart(15, '0');
  const codServico = codigoServico.padStart(5, '0');
  
  const cpfCnpjLimpo = cpfCnpjTomador.replace(/\D/g, '');
  const indicadorTomador = cpfCnpjLimpo.length === 11 ? '1' : '2'; // 1=CPF, 2=CNPJ
  const cpfCnpj = cpfCnpjLimpo.padStart(14, '0');
  
  const stringAssinatura = inscricao + serie + numero + data + trib + status + iss + 
                           valorServ + valorDed + codServico + indicadorTomador + cpfCnpj;
  
  console.log('String para assinatura RPS:', stringAssinatura);
  console.log('Tamanho:', stringAssinatura.length);
  
  // Calcular hash SHA-1
  const md = forge.md.sha1.create();
  md.update(stringAssinatura, 'utf8');
  
  // Assinar com RSA
  const signature = privateKey.sign(md);
  const signatureBase64 = forge.util.encode64(signature);
  
  console.log('Assinatura RPS gerada');
  
  return signatureBase64;
}

// Assina o XML completo com XMLDSig
function assinarXML(xml: string, privateKeyPem: string, certDerBase64: string): string {
  try {
    // Parse private key
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    
    // Calcular digest SHA-1 do XML (canonizado)
    const md = forge.md.sha1.create();
    md.update(xml, 'utf8');
    const digestBytes = md.digest().bytes();
    const digestBase64 = forge.util.encode64(digestBytes);
    
    // Criar SignedInfo
    const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
<Reference URI="">
<Transforms>
<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<DigestValue>${digestBase64}</DigestValue>
</Reference>
</SignedInfo>`;
    
    // Calcular hash SHA-1 do SignedInfo
    const mdSignedInfo = forge.md.sha1.create();
    mdSignedInfo.update(signedInfo, 'utf8');
    
    // Assinar SignedInfo
    const signature = privateKey.sign(mdSignedInfo);
    const signatureBase64 = forge.util.encode64(signature);
    
    // Montar bloco Signature
    const signatureBlock = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
${signedInfo}
<SignatureValue>${signatureBase64}</SignatureValue>
<KeyInfo>
<X509Data>
<X509Certificate>${certDerBase64}</X509Certificate>
</X509Data>
</KeyInfo>
</Signature>`;
    
    // Inserir assinatura no XML antes do fechamento do elemento raiz
    const xmlAssinado = xml.replace('</PedidoEnvioLoteRPS>', signatureBlock + '</PedidoEnvioLoteRPS>');
    
    console.log('XML assinado com sucesso');
    
    return xmlAssinado;
  } catch (err: unknown) {
    console.error('Erro ao assinar XML:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    throw new Error(`Falha ao assinar XML: ${message}`);
  }
}

// Envia requisição SOAP para webservice NFS-e SP
async function enviarSOAP(xml: string, apiUrl: string, action: string): Promise<string> {
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
<soap:Body>
<${action}Request xmlns="http://www.prefeitura.sp.gov.br/nfe">
<VersaoSchema>1</VersaoSchema>
<MensagemXML><![CDATA[${xml}]]></MensagemXML>
</${action}Request>
</soap:Body>
</soap:Envelope>`;

  console.log('Enviando requisição SOAP para:', apiUrl);
  console.log('Action:', action);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `http://www.prefeitura.sp.gov.br/nfe/${action}`
      },
      body: soapEnvelope
    });
    
    const responseText = await response.text();
    console.log('Status resposta SOAP:', response.status);
    console.log('Resposta SOAP (primeiros 1000 chars):', responseText.substring(0, 1000));
    
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${responseText.substring(0, 500)}`);
    }
    
    return responseText;
  } catch (err) {
    console.error('Erro na requisição SOAP:', err);
    throw err;
  }
}

// Parse resposta SOAP
function parseRespostaSOAP(soapResponse: string): { sucesso: boolean; numeroNFe?: string; codigoVerificacao?: string; erro?: string; alertas?: string[] } {
  try {
    // Extrair conteúdo do RetornoXML
    const retornoMatch = soapResponse.match(/<RetornoXML[^>]*>([\s\S]*?)<\/RetornoXML>/i);
    if (!retornoMatch) {
      // Tentar extrair diretamente
      const msgMatch = soapResponse.match(/<MensagemXML[^>]*>([\s\S]*?)<\/MensagemXML>/i);
      if (msgMatch) {
        return parseRetornoNFSe(msgMatch[1]);
      }
      return { sucesso: false, erro: 'Resposta inválida do webservice' };
    }
    
    return parseRetornoNFSe(retornoMatch[1]);
  } catch (err: unknown) {
    console.error('Erro ao parsear resposta SOAP:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return { sucesso: false, erro: `Erro ao processar resposta: ${message}` };
  }
}

function parseRetornoNFSe(xml: string): { sucesso: boolean; numeroNFe?: string; codigoVerificacao?: string; erro?: string; alertas?: string[] } {
  // Decode CDATA se presente
  let xmlDecoded = xml;
  if (xml.includes('CDATA')) {
    const cdataMatch = xml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    if (cdataMatch) {
      xmlDecoded = cdataMatch[1];
    }
  }
  
  // Verificar sucesso
  const sucessoMatch = xmlDecoded.match(/<Sucesso[^>]*>(true|false)<\/Sucesso>/i);
  const sucesso = sucessoMatch ? sucessoMatch[1].toLowerCase() === 'true' : false;
  
  // Extrair número da NF-e
  const numeroMatch = xmlDecoded.match(/<NumeroNFe[^>]*>(\d+)<\/NumeroNFe>/i);
  const numeroNFe = numeroMatch ? numeroMatch[1] : undefined;
  
  // Extrair código verificação
  const codigoMatch = xmlDecoded.match(/<CodigoVerificacao[^>]*>([^<]+)<\/CodigoVerificacao>/i);
  const codigoVerificacao = codigoMatch ? codigoMatch[1] : undefined;
  
  // Extrair erros
  const erroMatches = xmlDecoded.matchAll(/<Erro[^>]*>[\s\S]*?<Descricao[^>]*>([^<]+)<\/Descricao>[\s\S]*?<\/Erro>/gi);
  const erros: string[] = [];
  for (const match of erroMatches) {
    erros.push(match[1]);
  }
  
  // Extrair alertas
  const alertaMatches = xmlDecoded.matchAll(/<Alerta[^>]*>[\s\S]*?<Descricao[^>]*>([^<]+)<\/Descricao>[\s\S]*?<\/Alerta>/gi);
  const alertas: string[] = [];
  for (const match of alertaMatches) {
    alertas.push(match[1]);
  }
  
  return {
    sucesso: sucesso || !!numeroNFe,
    numeroNFe,
    codigoVerificacao,
    erro: erros.length > 0 ? erros.join('; ') : undefined,
    alertas: alertas.length > 0 ? alertas : undefined
  };
}

Deno.serve(async (req) => {
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

    // Parse certificado
    const { privateKey: privateKeyPem, certificate: certPem, certDer } = parsePFXCertificate(certificateBase64, certificatePassword);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    let result;

    switch (action) {
      case 'emitir':
        result = await emitirNfse(body, cnpj, ccm, apiUrl, privateKey, privateKeyPem, certDer, ambiente);
        break;
      case 'consultar':
        result = await consultarNfse(body.numeroNfse!, cnpj, ccm, apiUrl, privateKeyPem, certDer);
        break;
      case 'cancelar':
        result = await cancelarNfse(body.numeroNfse!, body.motivoCancelamento!, cnpj, ccm, apiUrl, privateKeyPem, certDer);
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
  privateKey: any,
  privateKeyPem: string,
  certDer: string,
  ambiente: string
) {
  const { servico, tomador } = request;

  if (!servico || !tomador) {
    throw new Error('Dados do serviço e tomador são obrigatórios para emissão');
  }

  // Gerar RPS
  const rpsNumero = Date.now().toString().slice(-8);
  const rpsSerie = '1';
  const dataEmissao = new Date().toISOString().split('T')[0];
  const tributacao = 'T'; // Simples Nacional
  const statusRPS = 'N';
  const issRetido = false;

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
      cidade: '3550308',
      uf: 'SP',
      cep: '04165010'
    }
  };

  // Gerar assinatura do RPS
  const assinaturaRPS = gerarAssinaturaRPS(
    prestador.ccm,
    rpsSerie,
    rpsNumero,
    dataEmissao,
    tributacao,
    statusRPS,
    issRetido,
    servico.valorServico,
    0, // valor deduções
    servico.codigoServico,
    tomador.cpfCnpj,
    privateKey
  );

  const cpfCnpjLimpo = tomador.cpfCnpj.replace(/\D/g, '');
  const tagCpfCnpj = cpfCnpjLimpo.length === 11 ? 'CPF' : 'CNPJ';

  // XML conforme modelo NFS-e SP
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
<Assinatura>${assinaturaRPS}</Assinatura>
<ChaveRPS>
<InscricaoPrestador>${prestador.ccm}</InscricaoPrestador>
<SerieRPS>${rpsSerie}</SerieRPS>
<NumeroRPS>${rpsNumero}</NumeroRPS>
</ChaveRPS>
<TipoRPS>RPS</TipoRPS>
<DataEmissao>${dataEmissao}</DataEmissao>
<StatusRPS>${statusRPS}</StatusRPS>
<TributacaoRPS>${tributacao}</TributacaoRPS>
<ValorServicos>${servico.valorServico.toFixed(2)}</ValorServicos>
<ValorDeducoes>0.00</ValorDeducoes>
<ValorPIS>0.00</ValorPIS>
<ValorCOFINS>0.00</ValorCOFINS>
<ValorINSS>0.00</ValorINSS>
<ValorIR>0.00</ValorIR>
<ValorCSLL>0.00</ValorCSLL>
<CodigoServico>${servico.codigoServico}</CodigoServico>
<AliquotaServicos>${servico.aliquota.toFixed(2)}</AliquotaServicos>
<ISSRetido>false</ISSRetido>
<CPFCNPJTomador>
<${tagCpfCnpj}>${cpfCnpjLimpo}</${tagCpfCnpj}>
</CPFCNPJTomador>
<RazaoSocialTomador>${tomador.razaoSocial}</RazaoSocialTomador>
${tomador.endereco ? `<EnderecoTomador>
<TipoLogradouro>R</TipoLogradouro>
<Logradouro>${tomador.endereco.logradouro}</Logradouro>
<NumeroEndereco>${tomador.endereco.numero}</NumeroEndereco>
<Bairro>${tomador.endereco.bairro}</Bairro>
<Cidade>${getCidadeIBGE(tomador.endereco.cidade)}</Cidade>
<UF>${tomador.endereco.uf}</UF>
<CEP>${tomador.endereco.cep.replace(/\D/g, '')}</CEP>
</EnderecoTomador>` : ''}
${tomador.email ? `<EmailTomador>${tomador.email}</EmailTomador>` : ''}
<Discriminacao>${servico.discriminacao}</Discriminacao>
</RPS>
</PedidoEnvioLoteRPS>`;

  console.log('XML RPS gerado com assinatura');
  console.log('Prestador:', prestador.razaoSocial);
  console.log('Tomador:', tomador.razaoSocial);
  console.log('Valor:', servico.valorServico);
  console.log('Código Serviço:', servico.codigoServico);

  // Assinar XML completo
  const xmlAssinado = assinarXML(xmlRps, privateKeyPem, certDer);
  console.log('XML assinado pronto para envio');

  // Enviar para webservice
  try {
    const resposta = await enviarSOAP(xmlAssinado, apiUrl, 'EnvioLoteRPS');
    const resultado = parseRespostaSOAP(resposta);
    
    console.log('Resultado do envio:', resultado);
    
    if (resultado.sucesso) {
      return {
        status: 'success',
        message: `NFS-e emitida com sucesso! Número: ${resultado.numeroNFe}`,
        nfse: {
          numero: resultado.numeroNFe,
          codigoVerificacao: resultado.codigoVerificacao
        },
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
        ambiente,
        alertas: resultado.alertas
      };
    } else {
      return {
        status: 'error',
        message: resultado.erro || 'Erro ao emitir NFS-e',
        rps: {
          numero: rpsNumero,
          serie: rpsSerie,
          dataEmissao
        },
        ambiente,
        erro: resultado.erro,
        alertas: resultado.alertas
      };
    }
  } catch (err: unknown) {
    console.error('Erro ao enviar para webservice:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      status: 'error',
      message: `Erro de comunicação: ${errorMessage}`,
      rps: {
        numero: rpsNumero,
        serie: rpsSerie,
        dataEmissao
      },
      ambiente,
      xmlGerado: true
    };
  }
}

async function consultarNfse(
  numeroNfse: string,
  cnpj: string,
  ccm: string,
  apiUrl: string,
  privateKeyPem: string,
  certDer: string
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

  console.log('XML Consulta gerado');

  // Assinar e enviar
  const xmlAssinado = assinarXML(xmlConsulta, privateKeyPem, certDer);
  
  try {
    const resposta = await enviarSOAP(xmlAssinado, apiUrl, 'ConsultaNFe');
    const resultado = parseRespostaSOAP(resposta);
    
    return {
      status: resultado.sucesso ? 'success' : 'error',
      message: resultado.sucesso ? 'Consulta realizada' : (resultado.erro || 'NFS-e não encontrada'),
      numeroNfse,
      dados: resultado
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      status: 'error',
      message: `Erro na consulta: ${errorMessage}`,
      numeroNfse
    };
  }
}

async function cancelarNfse(
  numeroNfse: string,
  motivo: string,
  cnpj: string,
  ccm: string,
  apiUrl: string,
  privateKeyPem: string,
  certDer: string
) {
  if (!motivo || motivo.length < 15) {
    throw new Error('Motivo do cancelamento deve ter no mínimo 15 caracteres');
  }

  // Gerar assinatura do cancelamento
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const stringAssinatura = ccm.replace(/\D/g, '').padStart(8, '0') + numeroNfse.padStart(12, '0');
  
  const md = forge.md.sha1.create();
  md.update(stringAssinatura, 'utf8');
  const signature = privateKey.sign(md);
  const assinaturaCancelamento = forge.util.encode64(signature);

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
<AssinaturaCancelamento>${assinaturaCancelamento}</AssinaturaCancelamento>
</Detalhe>
</PedidoCancelamentoNFe>`;

  console.log('XML Cancelamento gerado com assinatura');

  // Assinar e enviar
  const xmlAssinado = assinarXML(xmlCancelamento, privateKeyPem, certDer);
  
  try {
    const resposta = await enviarSOAP(xmlAssinado, apiUrl, 'CancelamentoNFe');
    const resultado = parseRespostaSOAP(resposta);
    
    return {
      status: resultado.sucesso ? 'success' : 'error',
      message: resultado.sucesso ? 'NFS-e cancelada com sucesso' : (resultado.erro || 'Erro ao cancelar'),
      numeroNfse,
      motivo,
      dados: resultado
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      status: 'error',
      message: `Erro no cancelamento: ${errorMessage}`,
      numeroNfse,
      motivo
    };
  }
}

function getCidadeIBGE(cidade: string): string {
  const cidades: Record<string, string> = {
    'São Paulo': '3550308',
    'SAO PAULO': '3550308',
    'sao paulo': '3550308',
  };
  return cidades[cidade] || '3550308';
}