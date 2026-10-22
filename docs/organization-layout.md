# Padrão visual da administração de organizações

Este documento complementa o [guia geral de interface e comportamento](ui-patterns.md), obrigatório para novas telas e alterações em todo o frontend. Layout, padding, ações, modais, estados e acessibilidade seguem o guia geral. Aqui ficam as particularidades da administração das organizações.

| Tela | Contexto e conteúdo |
| --- | --- |
| Organizações | Título, ação de cadastro e cards com ação principal e opções secundárias |
| Organização selecionada | Cabeçalho compartilhado, caminho de navegação e áreas Fontes de dados / Profiles de acesso |
| Membros | Mesmo cabeçalho da organização, título da seção e ação de adicionar/convidar |
| Convites | Mesmo cabeçalho, título da seção e consulta de convites com ações por item |
| Profiles — acesso direto | Mesmo cabeçalho; organização fixa e sem repetir a coluna de organização nos cards móveis |
| Permissões — acesso direto | Mesmo cabeçalho; nome do profile como título da seção e preservação dos grants existentes |
| Configuração da fonte | Nome da fonte como título, organização no caminho, mesmos limites e padding; passos e ações finais acessíveis |
| Modelos dentro da fonte | Editores incorporados ao contexto da fonte, sem repetir barra lateral ou título principal da página |

O componente OrganizationContextHeader concentra identificação, navegação e o menu Membros e convites. Usa o nome já disponível na sessão ou os dados carregados pela página; consulta a organização quando necessário em um acesso direto autorizado.

As tabelas de membros, convites e profiles mantêm o contexto da organização no celular. No editor de permissões, uma falha na consulta de grants bloqueia alterações até nova leitura; a edição de uma fonte preserva os grants das demais fontes do profile.

Reutilize OrganizationContextHeader, os estilos administrativos compartilhados e ConfirmDeleteModal. O fluxo de fontes de dados e os editores incorporados seguem o [guia de configuração](data-source-configuration.md).

Designer e execução de relatórios mantêm a estrutura própria de seus fluxos de trabalho. Este documento descreve a administração da organização.

A validação de navegador compara largura, posição e padding entre os acessos diretos, além de verificar a identidade da organização, a navegação, os modais e ausência de rolagem horizontal da página. As integrações nos testes usam respostas simuladas.
