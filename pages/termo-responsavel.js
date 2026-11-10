import Head from 'next/head'
import Documento from '../components/Documento'
import { TERMO_RESPONSAVEL } from '../lib/lgpd/termoResponsavel'
import { VIGENCIA } from '../lib/lgpd/config'

// Pagina para IMPRIMIR: tem campos em branco para preencher a mao e assinar.
export default function TermoResponsavel() {
  const rodape = (
    <section>
      <h2>6. Identificação e assinatura</h2>
      <p>Nome completo do aluno: <span className="doc-linha" style={{ minWidth: '360px' }} /></p>
      <p>Data de nascimento do aluno: <span className="doc-linha" style={{ minWidth: '160px' }} /> E-mail de acesso do aluno: <span className="doc-linha" style={{ minWidth: '260px' }} /></p>
      <p>Nome completo do responsável legal: <span className="doc-linha" style={{ minWidth: '340px' }} /></p>
      <p>Vínculo com o aluno (mãe, pai, tutor, outro): <span className="doc-linha" style={{ minWidth: '200px' }} /> Documento (RG ou CPF): <span className="doc-linha" style={{ minWidth: '200px' }} /></p>
      <p>Declaro que li e compreendi este termo e a Política de Privacidade e que <b>consinto</b> com o tratamento dos dados do aluno acima, nas condições descritas.</p>
      <p>Local e data: <span className="doc-linha" style={{ minWidth: '300px' }} /></p>
      <div className="doc-assinatura">
        <div>Assinatura do responsável legal</div>
        <div>Recebido pelo professor (nome e data)</div>
      </div>
    </section>
  )
  return (
    <>
      <Head><title>English Step By Step - Termo de Consentimento do Responsável</title></Head>
      <Documento doc={TERMO_RESPONSAVEL} vigencia={VIGENCIA} rodape={rodape} />
    </>
  )
}
