# Revisão do redesign para Vitória

Revisão local em setembro de 2026. Base inspecionada: `e121906` da branch `main`. Autoria da experiência: PMR. Conteúdo em português-BR.

## O que foi confirmado

- Repositório clonado limpo; nenhum `AGENTS.md` encontrado no repositório ou nos diretórios de instrução consultados.
- HTML/CSS/JS duplicados na raiz e em `site/`; conteúdo idêntico. README e workflow confirmavam a publicação de `site/`.
- Workflow em push para `main` e execução manual, sem testes ou build existentes. Nenhum disparo foi feito.
- Hero, três motivos e carta pessoal presentes. Nenhuma foto, áudio, fonte externa ou biblioteca no original.
- Versão original executada em desktop e celular. Site público acessado com navegador; a ferramenta de pesquisa web não conseguiu acessá-lo.
- Defeitos originais: carta oculta sem JavaScript; falta de foco explícito na leitura; grande vazio acima do envelope no celular; encerramento cortado nas laterais; motivos dependentes de hover para o efeito visual.

## Direção e implementação

Vinho `#260e17`, creme `#f4eddf`, papel `#fcf7ed`, rosa `#dfb4b4` e tinta `#39232a`. Cormorant Garamond normal/itálica local, cerca de 75 KiB, com Georgia de fallback. Arial em controles e legendas.

A narrativa alterna abertura escura, hero com correspondência, mesa de bilhetes, seis motivos, surpresa breve, carta e promessa final. A carta original foi mantida; não foram criadas datas, locais ou memórias biográficas. Sem fotos, os bilhetes são a composição final. Flor, selo e envelope são SVG/CSS, sem imagens geradas ou fotos de banco.

Movimento concentrado em transform/opacity, sem bibliotecas. Entrada pulável imediatamente, âncoras livres e sessão persistente. Envelope em etapas, carta em dialog, foco e scroll restaurados. Motivos nativos em details. Corações limitados a dez, sem loop decorativo permanente. Preferência por movimento reduzido respeitada; texto essencial disponível sem JS.

## Três rodadas visuais realizadas

Cada rodada incluiu abertura no navegador, capturas, inspeção de imagens, correção e novas capturas. Evidências completas estão na pasta `outputs/evidencias` da entrega; uma seleção permanece neste repositório.

| Rodada         | Defeitos observados                                                                                                                                                                                                 | Correção e nova verificação                                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — composição | Contorno do hero ultrapassava 22 px no celular e 34 px no desktop; papel posterior encobria legenda; carta aparecia no envelope fechado.                                                                            | Contorno contido, altura do papel posterior corrigida, carta decorativa invisível até a aba abrir. Novas capturas em 390/1440 com `scrollWidth === innerWidth`.                                                                                 |
| 2 — interações | Troca de cor dos cartões produzia contraste insuficiente durante a transição; resposta do coração surgia abaixo da área visível; segredo e player podiam cobrir controles; WebKit não focava o acionador ao clicar. | Cores passam juntas, mensagem rola para a leitura, segredo recebe fechamento, rodapé reserva espaço quando há player e retorno de foco aponta ao botão. Carta, coração parcial/completo, envelope intermediário e cartões abertos recapturados. |
| 3 — acabamento | Detalhes e legenda do bilhete pequenos; título quebrava demais entre 700–800 px; textura global acrescentava ruído às capturas.                                                                                     | Ajuste dos tamanhos pequenos, título proporcional em telas intermediárias e textura discreta somente no papel. Novas capturas integrais/por capítulo e layout de 200% por reflow emulado.                                                       |

O navegador também foi operado interativamente com agent-browser. Há gravações curtas das interações, além dos estados estáticos. Algumas capturas intermediárias feitas imediatamente após rolagem apresentaram pintura incompleta; as capturas finais aguardam estabilização e a textura fixa foi retirada.

## Resultados medidos

| Verificação                  | Resultado                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                     | Instalação reproduzível, três pacotes de desenvolvimento; zero vulnerabilidades reportadas pelo npm.                                     |
| `npm run check`              | Sintaxe de JavaScript e servidor aprovada.                                                                                               |
| `npm test`                   | 16/16 fluxos aprovados em Chromium e WebKit.                                                                                             |
| `npm run test:resilience`    | 11/11 cenários aprovados.                                                                                                                |
| `npm run test:layout`        | Nove configurações aprovadas, sem overflow da página ou erros de JS/rede nos cenários normais.                                           |
| Axe 4.13.0                   | Zero violações detectadas nos estados auditados de página e modal; itens dependentes de inspeção humana também revisados visualmente.    |
| Touch emulado                | Toque breve cancela em ambos; hold completo via touch CDP no Chromium; equivalente simples por tap no WebKit. Cartões funcionam por tap. |
| Lighthouse 13.5.0, entrada   | Performance 98, Acessibilidade 100, Boas práticas 100, SEO 100; LCP 1,9 s, TBT 110 ms, CLS 0.                                            |
| Lighthouse 13.5.0, `#inicio` | Performance 98, Acessibilidade 100, Boas práticas 100, SEO 100; LCP 2,0 s, TBT 120 ms, CLS 0.                                            |

Playwright 1.63.0; Chromium 153 e WebKit 26.6 em Windows. Layouts: 360×800, 390×844, 768×1024, 1440×1000, paisagem 844×390, reflow 720×500 equivalente à área CSS de 1440×1000 a 200%, movimento reduzido 390, JavaScript desabilitado 390 e WebKit móvel 390.

Lighthouse em localhost, perfil mobile e throttling simulados, Chrome Headless Shell. O Chrome completo instalado não abriu por erro de configuração lado a lado do Windows; foi utilizado o Headless Shell do Playwright. Pontuações de laboratório não comprovam acessibilidade completa, fluidez em qualquer dispositivo ou Core Web Vitals de visitantes reais.

## Fluxos cobertos

Primeira visita, pular rapidamente, retorno na sessão, replay intencional, Escape na introdução, acesso direto a `#cartinha`, histórico voltar/avançar; leitura repetida com foco contido/devolvido, carta longa e scroll; motivos por teclado/tap; ambos os segredos; hold completo, breve, pointercancel, perda de foco e saída do ponteiro; limite/remoção de partículas; falta de mídia; JS/fontes bloqueados; storage indisponível; ausência de IntersectionObserver; rede limitada a 200 kB/s e 150 ms; caminhos sob `/Vick-10_08/` e nenhuma requisição externa do site.

## Limites e personalização futura

- Não foi usado iPhone físico, leitor de tela real ou zoom pela interface de um navegador visível. WebKit móvel, teclado, semântica e reflow de 200% foram emulados.
- Não há foto real nem faixa musical. Isso não deixa buracos na página; ambas podem ser adicionadas conforme o README.
- Áudio de teste silencioso servido apenas em memória. Chromium decodificou o WAV real. WebKit para Windows rejeitou esse codec; nele, reprodução/fade/pausa foram testados com adaptador de mídia, e erro de arquivo foi testado normalmente. A faixa futura precisa ser ouvida e validada no dispositivo de destino.
- A implantação continua pendente de autorização. Não houve push, merge, deploy nem alteração no site público durante este trabalho.

## Correção posterior — animação de entrada

Após o relato de que a animação não aparecia, a entrada foi reproduzida com e sem movimento reduzido. O fundo opaco do `dialog::backdrop` encobria o hero enquanto a cortina subia; além disso, o fechamento em 700 ms cortava uma animação de 750 ms. O fundo agora fica transparente durante a saída, as linhas do hero começam a aparecer sob a cortina e `animationend` encerra a transição. Um timer de segurança de 1 s libera a página se a animação não ocorrer.

O novo botão **ver abertura ↺** permite repetir a sequência desde o hero. O bypass por sessão e por âncora permanece. Movimento reduzido continua sendo o padrão quando solicitado pelo sistema; **ver com animações** permite uma escolha explícita, reversível, persistida apenas na sessão e aplicada tanto ao CSS quanto ao JavaScript.

Validação posterior: `npm run check`, 8/8 testes de `npm run test:entrance` e 16/16 regressões de `npm test` passaram. Chromium e WebKit cobriram a revelação durante a cortina, replay, foco, movimento reduzido e sua escolha explícita, persistência, falha de animação, âncora direta e paisagem. Auditoria complementar verificou Escape seguido de replay, troca da preferência durante a saída e controles de 44 px sem overflow. Axe retornou zero violações na introdução em ambos os navegadores. Lighthouse, resiliência e a matriz completa de layout não foram repetidos nesta correção.

Foram gravadas execuções desktop e mobile e inspecionados os estados intermediário e final. Na galeria da entrega: `entrada-corrigida-desktop.webm`, `entrada-corrigida-mobile.webm`, `cortina-corrigida-mobile.png`, `entrada-chromium-final.png`, `entrada-webkit-final.png` e `entrance.json`. Os testes continuam sendo emulação em Windows, sem validação em iPhone físico.

## Evidências selecionadas

- [Original desktop](evidence/antes-desktop.png)
- [Original celular](evidence/antes-mobile.png)
- [Novo hero desktop](evidence/depois-desktop.png)
- [Nova experiência celular](evidence/depois-mobile.png)
- [Carta aberta e surpresa do coração](evidence/carta-mobile.png)
