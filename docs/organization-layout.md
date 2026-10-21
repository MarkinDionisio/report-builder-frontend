# Padrão visual da administração de organizações

As telas administrativas compartilham o mesmo contêiner, com largura máxima de 1440 px e margens laterais de 24 px no desktop e 16 px no celular. A barra superior continua reservando seu espaço.

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

As seções usam títulos secundários, explicação curta e ações alinhadas. Ações menos usadas ficam em menus. As tabelas de membros, convites e profiles se adaptam ao celular mantendo contexto e ações. Erros de carregamento de permissões mantêm o contêiner da página e a opção de tentar novamente, sem liberar gravações com dados incompletos.

Os modais administrativos de organização, membro, convite gerado e confirmação usam padding de 24/16 px, altura limitada à janela e rolagem interna. Formulários longos mantêm o rodapé de ações acessível.

Designer e execução de relatórios mantêm a estrutura própria de seus fluxos de trabalho. Este documento descreve a administração da organização.

A validação de navegador compara largura, posição e padding entre os acessos diretos, além de verificar a identidade da organização, a navegação, os modais e ausência de rolagem horizontal da página. As integrações nos testes usam respostas simuladas.
