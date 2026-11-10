# Plano de Resposta a Incidentes de Segurança

**Controlador/encarregado:** Gabriel Menezes — gabrielprojects97@gmail.com · **Data:** 10/11/2026
> Minuta. Prazos e conteúdo da comunicação seguem a regulamentação da ANPD (Resolução CD/ANPD nº 15/2024, que prevê comunicação em **3 dias úteis** para incidentes que possam causar risco ou dano relevante) **[REVISAR]**.

## O que é um incidente
Qualquer evento que comprometa dados pessoais: acesso indevido, vazamento, perda, alteração ou destruição não autorizados. Exemplos: conta de professor invadida, foto de aluno exposta, banco acessado por terceiro, chave de serviço vazada, mensagem enviada ao destinatário errado.

## Passo a passo

**1. Conter (imediato)**
- Trocar a senha do professor e das contas envolvidas.
- Se uma chave vazou (service_role, tokens): **revogar e gerar nova** no Supabase e atualizar a variável de ambiente na Vercel.
- Suspender o acesso de contas suspeitas (Remover Acesso ou redefinir senha).
- Se necessário, tirar o site do ar (pausar o deploy na Vercel).

**2. Registrar (no mesmo dia)**
Anotar: data e hora, como foi descoberto, quais dados e quantos titulares, se há menores, causa provável. Guardar prints e logs (Vercel e Supabase).

**3. Avaliar o risco**
O incidente pode causar **risco ou dano relevante** aos titulares? Dados de menores, fotos, mensagens privadas e credenciais costumam ser relevantes. Na dúvida, tratar como relevante.

**4. Comunicar (se relevante)**
- **ANPD**, pelo formulário de comunicação de incidente de segurança, em até **3 dias úteis** do conhecimento **[REVISAR]**.
- **Titulares afetados** (para menores, os responsáveis), por e-mail, em linguagem simples, com: o que aconteceu, quais dados, riscos, o que foi feito e o que a pessoa pode fazer (por exemplo, trocar a senha) e o contato do encarregado.

**5. Corrigir e prevenir**
Corrigir a causa (por branch, testes e deploy, como no fluxo de trabalho do projeto), revisar permissões e atualizar o RIPD se necessário.

**6. Documentar a lição**
Registrar no final: causa, ações tomadas, prazos cumpridos e melhorias.

## Contatos úteis
- Supabase e Vercel: suporte pelos painéis dos provedores.
- ANPD: https://www.gov.br/anpd
- Encarregado: gabrielprojects97@gmail.com
