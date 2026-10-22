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

- Use NeutralLoader em todos os carregamentos de dados: painel com spinner, título e mensagem específica; use compact em regiões pequenas e atualizações que preservam o conteúdo. A mensagem é obrigatória. Consultas usam “Consultando [dados]…”, enquanto verificações, execução e gravação descrevem a operação real. Use reticências tipográficas (…). Botões mantêm rótulos curtos da ação em andamento.
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

- NeutralLoader e Alert centralizam mensagens de consulta e a identificação acessível de progresso e erro. Informe sempre a operação concreta ao usar o carregamento.
- ConfirmDeleteModal centraliza confirmações de exclusão e revogação, bloqueio de repetição, erro no modal e comportamento de teclado. useModalFocus mantém o foco nos formulários abertos e o devolve ao controle de origem ao fechar.
- SourceActionMenu agrupa ações secundárias; OrganizationContextHeader mantém a identidade da organização. A área de criação também preserva a aba pela URL.
- A classe admin-page aplica largura e padding administrativos; admin-form-dialog mantém cabeçalho e ações dos formulários longos acessíveis. Designer e execução mantêm os próprios contêineres.

## Escopos de junção e importação

- Distinguir modelos de junção da organização e templates globais de junção na biblioteca da fonte. A fonte é referência de compatibilidade e preenchimento, sem limitar o modelo local a ela. Templates são snapshots independentes; excluir a origem ou o template não altera cópias.
- Somente root gerencia modelos e templates manualmente. A importação autorizada de relatórios globais pode criar modelos locais automaticamente para creators e administradores, sem conceder permissões nem liberar gerenciamento manual. A prévia deve indicar modelos reutilizados e criados; o servidor grava relatório e modelos na mesma transação.
- Modelos em uso mostram dependências e restrições de estrutura, tipo, habilitação e exclusão; nome e alias sugerido podem mudar. Oferecer Duplicar modelo como alternativa independente. Confirmações e erros permanecem no modal; conflito de aplicação invalida a prévia.
