# Padrões de interface e comportamento

Referência central para todas as novas telas e alterações de interface do Report Builder. Estes padrões consolidam as decisões aprovadas durante a configuração de organizações e fontes de dados. Aplique-os à parte modificada de uma tela existente; a revisão de todas as telas não faz parte de cada implementação.

## Layout e hierarquia

- Reutilize componentes, classes e estilos existentes antes de criar outra implementação. Mantenha alinhamento, espaçamento entre seções e hierarquia de títulos consistentes: título da página, título da seção e identificação do item.
- Na administração, use contêiner com largura máxima de 1440 px, centralizado, com padding lateral de 24 px no desktop e 16 px no celular. O breakpoint administrativo atual é 720 px. Reserve o espaço da navegação superior e mantenha padding também nos estados de erro, carregamento e lista vazia.
- Modais administrativos usam padding de 24 px no desktop e 16 px no celular, altura limitada à janela e rolagem interna. Em conteúdos longos, mantenha as ações finais visíveis em um rodapé fixo ou aderente, sem cobrir conteúdo ou foco.
- Designer e execução de relatórios preservam suas estruturas próprias. Aplique os princípios de clareza e comportamento sem impor a esses fluxos o contêiner administrativo.

## Contexto e navegação

- Mostre organização, fonte e tabela quando aplicável, usando cabeçalho, caminho de navegação e identificação próxima do conteúdo. Campos devem permanecer associados visualmente à sua tabela.
- Reutilize o contexto já escolhido; evite formulários duplicados e novas seleções de organização ou fonte sem necessidade.
- Guarde na URL os identificadores e etapas necessários para acesso direto, retomada e voltar/avançar do navegador. Valide se o recurso pertence ao contexto da URL. Credenciais ficam apenas no estado transitório do formulário.
- Explique brevemente o objetivo da etapa, o que será salvo e seu efeito no uso dos dados ou relatórios. Use indicadores derivados dos dados persistidos; campos existentes não comprovam revisão humana.

## Ações, formulários e confirmações

- Destaque a ação principal; agrupe ações secundárias ou menos usadas em menus com nomes claros. Evite vários botões com o mesmo destaque e distribua as ações de modo legível no celular.
- Confirmações destrutivas usam o modal padrão do sistema, atualmente ConfirmDeleteModal, com nome do item, consequências, Cancelar e Confirmar Exclusão. Não introduza window.confirm ou window.alert. Uma confirmação deve explicar quando só a configuração será removida e os dados de origem serão preservados.
- Evite envios duplicados com bloqueio da operação, além do estado visual desabilitado. Mostre a operação em andamento e bloqueie ações incompatíveis enquanto ela não terminar.
- Preserve os dados úteis após uma falha, apresente o erro no respectivo formulário ou modal e permita corrigir ou tentar novamente. Cancelar deve ter resultado previsível; informe quando uma etapa anterior já foi salva e continuará cadastrada.
- Quando houver teste de conexão, permita realizá-lo antes de salvar. Diferencie o teste transitório da validação persistida de somente leitura necessária para executar relatórios.

## Carregamento, erros e conclusão

- Use ContentSkeleton no carregamento inicial de listas, tabelas e cards com estrutura conhecida, preservando cabeçalhos e navegação. Placeholders ficam ocultos dos leitores de tela; uma única mensagem contextual anuncia o progresso. Use NeutralLoader para consultas sem estrutura previsível, verificações e execução inicial de relatórios, com painel suave e mensagem obrigatória. Nas atualizações da mesma consulta, preserve dados e use NeutralLoader compact com “Atualizando…”, aria-busy e bloqueio de ações incompatíveis. Ao mudar organização, fonte ou relatório, limpe o contexto anterior. Consultas usam “Consultando [dados]…”; operações descrevem a ação real. Botões mantêm indicador e rótulo curto. Respeite movimento reduzido, sem porcentagens, estimativas ou atrasos artificiais.
- Carregamentos precisam ser evidentes, com mensagem específica sobre a operação e indicador visual. Prefira “Consultando conexão, tabelas, campos e permissões desta fonte…” a um “Carregando…” sem contexto; use título destacado quando o carregamento ocupar a página ou modal.
- Trate carregamento, lista vazia, falha, acesso negado e nova tentativa. Preserve o contêiner e o contexto em todos esses estados. Não habilite gravações dependentes de dados cuja leitura falhou.
- Após salvar, atualize o catálogo ou resumo afetado e encaminhe ao próximo passo correto. Use os IDs persistidos do destino: os IDs do snapshot de um template não identificam as tabelas recém-criadas.
- Feche o modal ao navegar e mostre uma confirmação clara. Após aplicar modelo ou cadastrar tabela manualmente, abra Revisar os campos na tabela criada. Na importação, Revisar campos abre uma tabela importada com sucesso, sem manter a seleção anterior.
- Falhas parciais mantêm resultados individuais e permitem repetir somente os itens que falharam. Não esconda esses resultados ao avançar automaticamente.
- Invalide prévias quando mudar a entrada que determina sua compatibilidade. Após conflito de aplicação de modelo, exija uma nova prévia.

## Listas extensas, busca e seleção

- Agrupe campos por tabela e mantenha identificação pública e física acessível. Ofereça busca, filtros e paginação conforme o volume, sem exigir navegação por uma lista de campos soltos.
- Todo campo de busca com texto oferece a ação acessível “Limpar busca”, usando ClearSearchButton sempre dentro da caixa de texto, à direita, em um contêiner posicionado e com padding no input para não sobrepor o texto. As opções Aa e expressão exata ficam fora da caixa. Limpar remove apenas o texto, mantém os outros filtros e opções, reinicia a paginação quando ela depende da busca e devolve o foco ao campo. Não dependa do botão nativo do navegador.
- Buscas textuais desse tipo oferecem diferenciação de maiúsculas/minúsculas (Aa) e expressão exata, reutilizando SearchMatchOptions e matchesTextSearch. “Expressão exata” não significa expressão regular.
- Ofereça marcar/desmarcar todos quando houver seleção em lote. Explicite se a ação abrange página, resultados filtrados ou toda a lista e informe seleções mantidas em outras páginas ou filtros. Não use rótulos ambíguos.
- Na configuração de campos, exiba controles de seleção quando solicitados e mantenha filtros e ações secundárias agrupados. Itens incompatíveis ficam bloqueados com o motivo visível; não permita aplicar sem campos selecionados nem criar schemas vazios.

## Permissões, responsividade e acessibilidade

- Preserve as permissões atuais e as configurações fora do contexto editado. Editar grants de uma fonte não pode apagar grants das demais fontes do profile. Não conceda acesso automaticamente.
- A API continua sendo a autoridade de autorização; a interface deve respeitar as mesmas restrições, inclusive em acesso direto. Diferencie catálogo configurado, conexão validada e acesso concedido.
- Valide desktop e celular com nomes longos, muitas tabelas e muitos campos. A página não deve ter rolagem horizontal; regiões de dados podem ter rolagem própria quando necessária e acessível.
- Use nomes acessíveis nos controles, labels nos formulários, identificação de diálogos, role=status para progresso e role=alert para erros. Garanta teclado, foco visível e gestão de foco ao abrir e fechar modais ou menus.

## Verificação e manutenção

Antes de concluir uma alteração de interface, verifique:

- Contexto: organização, fonte, tabela e etapa corretos, incluindo URL, acesso direto e voltar/avançar.
- Layout: padding, alinhamento, títulos, ação principal e menus consistentes.
- Estados: carregamento específico e evidente, vazio, erro, acesso negado e nova tentativa.
- Fluxo: cancelamento previsível, prevenção de envio duplicado, atualização dos dados, modal fechado e destino correto após sucesso.
- Volume: busca, filtros, seleção e alcance das ações em lote claros; ações finais acessíveis em conteúdo longo.
- Permissões: isolamento entre organizações e preservação de configurações de outros contextos.
- Celular e acessibilidade: sem rolagem horizontal da página, controles legíveis, teclado e foco utilizáveis.

Execute build, lint e testes pertinentes para alterações de código, com verificações proporcionais à mudança. Para mudanças de layout ou fluxo, valide no navegador em desktop e celular, incluindo conteúdo extenso. Use testes de comportamento para navegação, erros, cancelamento, conflitos ou permissões quando afetados; não crie testes que apenas repitam estilos ou implementação. Para documentação isolada, confira links e consistência, sem exigir build da aplicação.

Novos padrões explicitamente aprovados pelo usuário devem ser incorporados aqui. Particularidades das organizações ficam no [guia administrativo](organization-layout.md); o fluxo de fontes fica no [guia de configuração](data-source-configuration.md). Uma inconsistência legada não constitui um novo padrão. Registre verificações executadas e limitações na entrega. Commit, push e publicação dependem da instrução do usuário; este guia não os autoriza automaticamente.

## Referências de implementação

- ContentSkeleton, NeutralLoader e Alert centralizam carregamento estrutural, mensagens de operação e a identificação acessível de progresso e erro. Informe sempre a operação concreta ao usar o carregamento.
- ConfirmDeleteModal centraliza confirmações de exclusão e revogação, bloqueio de repetição, erro no modal e comportamento de teclado. useModalFocus mantém o foco nos formulários abertos e o devolve ao controle de origem ao fechar.
- SourceActionMenu agrupa ações secundárias; OrganizationContextHeader mantém a identidade da organização. A área de criação também preserva a aba pela URL.
- A classe admin-page aplica largura e padding administrativos; admin-form-dialog mantém cabeçalho e ações dos formulários longos acessíveis. Designer e execução mantêm os próprios contêineres.

## Escopos de junção e importação

- Distinguir modelos de junção da organização e templates globais de junção na biblioteca da fonte. A fonte é referência de compatibilidade e preenchimento, sem limitar o modelo local a ela. Templates são snapshots independentes; excluir a origem ou o template não altera cópias.
- Somente root gerencia modelos e templates manualmente. A importação autorizada de relatórios globais pode criar modelos locais automaticamente para creators e administradores, sem conceder permissões nem liberar gerenciamento manual. A prévia deve indicar modelos reutilizados e criados; o servidor grava relatório e modelos na mesma transação.
- Modelos em uso mostram dependências e restrições de estrutura, tipo, habilitação e exclusão; nome e alias sugerido podem mudar. Oferecer Duplicar modelo como alternativa independente. Confirmações e erros permanecem no modal; conflito de aplicação invalida a prévia.

## Período móvel de vendas

- O filtro “Últimos 12 meses (mês atual parcial)” inclui o mês atual e os 11 anteriores. A API recalcula os limites no fuso da organização em cada execução e prévia. Use esse rótulo para explicitar que o mês atual está em andamento.

## Etiquetas e descrições de relatórios

- Relatórios podem ter várias etiquetas da própria organização; etiquetas organizam a lista, sem conceder acesso. Root e administradores gerenciam nomes e exclusões; editores associam etiquetas existentes. Excluir uma etiqueta exige confirmação e preserva os relatórios.
- As listas do painel inicial e da organização mostram título curto, descrição resumida e etiquetas. Busca e filtros ficam na URL e são aplicados pela API antes da paginação. Várias etiquetas significam qualquer uma delas; “Sem etiquetas” tem prioridade, preservando a seleção para quando for desmarcado.
- A descrição é texto simples opcional de até 2.000 caracteres, exibido integralmente na execução. Parâmetros automáticos bloqueados continuam ocultos. Na importação global, copiar a descrição e selecionar etiquetas locais; não copiar nem criar etiquetas da origem automaticamente.

- Na seleção de etiquetas, usar um select múltiplo com chips removíveis dentro do campo e lista suspensa de opções com checkbox. A busca fica no próprio campo; oferecer remoção individual e limpeza da seleção, preservar itens escolhidos fora da busca e permitir alternar opções por teclado. Escape fecha a lista sem fechar o modal; clique fora também fecha. Aplicar padding ao conteúdo abaixo das abas e aos painéis do dashboard.

- No painel inicial, o seletor de etiquetas identifica a empresa em cada opção e chip selecionado (`Etiqueta · Empresa`) e permite buscar por ambos. Na área de criação, edição e importação com organização definida, mostrar apenas o nome da etiqueta. IDs continuam sendo a identidade da seleção, mesmo quando nomes coincidem entre empresas.

- Quando uma API anterior omitir o nome da empresa nas etiquetas, resolver o nome pelos relatórios acessíveis filtrados por organização, uma consulta por empresa. Não exibir UUID como nome; se a organização não estiver mais disponível, informar “Empresa indisponível”.

- Na área de criação, Abrir é a ação principal visível; Editar relatório e Excluir relatório ficam no menu Opções. Reutilizar SourceActionMenu e ConfirmDeleteModal, identificar o relatório, informar o impacto no acesso compartilhado e preservar dados da fonte. Após excluir, atualizar lista e contagem e voltar à página anterior quando a última linha da página for removida; manter filtros da URL. Falhas permanecem no modal.

## Exportações e notificações

- Na execução de relatórios salvos com dados, Exportar dados oferece Excel e CSV para todas as linhas. Informar que será feita nova consulta com os parâmetros informados na última execução; períodos automáticos são calculados no servidor ao solicitar. Congelar esses valores durante a espera na fila. Alterar parâmetros exige executar novamente antes de solicitar. Confirmar a entrada na fila sem manter a tela bloqueada durante a geração.
- O sino da navegação reúne avisos persistidos e arquivos do usuário, com contador de não lidos, estados Na fila, Gerando, Disponível, Falhou e Expirada. Disponibilizar download explícito, validade de 24 horas e acesso ao relatório para nova solicitação. Não iniciar download automaticamente.
- Atualizar exportações e avisos a cada 15 segundos com sessão autenticada e aba visível, e ao retornar à aba. Preservar os dados em falhas de atualização, permitir nova tentativa e limpar o contexto ao trocar usuário. O painel deve funcionar em desktop e celular, com fechamento por Escape, foco contido e devolvido ao sino.
