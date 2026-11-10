import Link from 'next/link'

// Renderiza um documento estruturado: { titulo, versao, secoes: [{ t, p: [], l: [], tabela: { cab: [], linhas: [[]] } }] }
export default function Documento({ doc, vigencia, rodape }) {
  return (
    <div className="doc-pagina">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="doc-topo">
        <Link href="/">← Voltar ao sistema</Link>
        <button onClick={() => window.print()} className="doc-imprimir">🖨 Imprimir / salvar em PDF</button>
      </div>
      <article className="doc-corpo">
        <h1>{doc.titulo}</h1>
        <p className="doc-meta">Versão {doc.versao} · Em vigor desde {vigencia}</p>
        {doc.aviso && <p className="doc-aviso">{doc.aviso}</p>}
        {doc.secoes.map((s, i) => (
          <section key={i}>
            {s.t && <h2>{s.t}</h2>}
            {(s.p || []).map((p, j) => <p key={j}>{p}</p>)}
            {s.l && <ul>{s.l.map((x, j) => <li key={j}>{x}</li>)}</ul>}
            {s.tabela && (
              <div className="doc-tabela">
                <table>
                  <thead><tr>{s.tabela.cab.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>
                  <tbody>{s.tabela.linhas.map((l, j) => <tr key={j}>{l.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        ))}
        {rodape}
      </article>
    </div>
  )
}

const CSS = `
  .doc-pagina{background:#f0f4f8;min-height:100vh;padding:16px;font-family:'Segoe UI',Tahoma,sans-serif;color:#222}
  .doc-topo{max-width:820px;margin:0 auto 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
  .doc-topo a{color:#1565c0;font-weight:600;text-decoration:none}
  .doc-imprimir{background:#1565c0;color:#fff;border:none;border-radius:9px;padding:8px 16px;cursor:pointer;font-size:.9rem;font-weight:600}
  .doc-corpo{max-width:820px;margin:0 auto;background:#fff;border-radius:14px;padding:28px 30px;box-shadow:0 2px 8px rgba(0,0,0,.08);line-height:1.65}
  .doc-corpo h1{font-size:1.5rem;color:#0d2157;margin-bottom:6px}
  .doc-corpo h2{font-size:1.08rem;color:#0d2157;margin:22px 0 8px}
  .doc-corpo p{margin:8px 0;font-size:.95rem}
  .doc-corpo ul{margin:8px 0 8px 22px;font-size:.95rem}
  .doc-corpo li{margin:4px 0}
  .doc-meta{color:#777;font-size:.85rem!important}
  .doc-aviso{background:#fff8e1;border-left:4px solid #f9a825;padding:10px 14px;border-radius:8px;font-size:.88rem!important}
  .doc-tabela{overflow-x:auto;margin:10px 0}
  .doc-tabela table{border-collapse:collapse;width:100%;font-size:.86rem}
  .doc-tabela th{background:#0d2157;color:#fff;text-align:left;padding:8px 10px}
  .doc-tabela td{border-bottom:1px solid #e3e8ef;padding:8px 10px;vertical-align:top}
  .doc-linha{border-bottom:1px solid #333;display:inline-block;min-width:260px;height:1.2em;vertical-align:bottom}
  .doc-assinatura{margin-top:34px;display:grid;grid-template-columns:1fr 1fr;gap:34px}
  .doc-assinatura div{border-top:1px solid #333;padding-top:4px;font-size:.85rem;text-align:center}
  @media(max-width:600px){.doc-corpo{padding:20px 16px}.doc-assinatura{grid-template-columns:1fr}}
  @media print{
    .doc-topo{display:none}
    .doc-pagina{background:#fff;padding:0}
    .doc-corpo{box-shadow:none;border-radius:0;padding:0;max-width:none}
    .doc-tabela table{font-size:.8rem}
  }
`
