# Configurar fontes de dados

Acesse **Organizações → organização → Fontes de dados → Configurar fonte**. Fontes sem tabelas também aparecem na lista. O cabeçalho mantém a organização e a fonte visíveis.

1. **Conectar o banco:** cadastre uma conexão na organização escolhida. Use Testar conexão antes de salvar. O teste não substitui a validação persistida: consulte o estado em Conectar o banco e use Validar somente leitura. A fonte salva ainda não disponibiliza tabelas nem concede acesso.
2. **Escolher tabelas:** use Importar do banco para buscar tabelas/views, selecionar resultados e revisar a prévia. A importação cadastra tabelas e campos; não copia dados. Cada tabela possui resultado individual. Em falhas parciais, repita somente as falhas. Usar modelo de catálogo só funciona com catálogo vazio; fontes com catálogo existente podem acrescentar tabelas pela importação. O cadastro manual está em Opções avançadas.
3. **Revisar os campos:** escolha uma tabela para editar nomes públicos, habilitação, sensibilidade, operações, operadores e agregações. A busca oferece Aa e expressão exata. Filtros ficam no botão Filtros; use Selecionar para exibir as caixas e ações em lote. No celular, use Opções da tabela → Trocar tabela para abrir a lista. A paginação e a seleção em lote facilitam catálogos grandes. Marcar resultados inclui todas as páginas do filtro atual; as ações em lote também abrangem seleções mantidas em outros filtros. Campos existentes não significam que houve revisão humana. Estas configurações limitam o que poderá ser concedido aos membros.
4. **Definir acesso:** escolha ou crie um profile da organização e configure suas permissões com a fonte já selecionada. Os grants das demais fontes são preservados; nenhuma permissão é concedida automaticamente. Se a leitura dos grants falhar, o editor bloqueia alterações até uma nova consulta. Associe os membros ao profile. O resumo final mostra conexão, validação de leitura, tabelas, campos e estado das permissões. Use o acesso à criação de relatórios para continuar.

## Modelos reutilizáveis

Na fonte, abra **Mais opções → Modelos reutilizáveis**. Modelos de catálogo continuam globais e guardam cópias independentes das configurações de tabelas e campos, sem credenciais ou permissões. Excluir um modelo não remove cópias já aplicadas. Salvar catálogo como modelo exige campos cadastrados. A aplicação faz introspecção e permite selecionar somente itens compatíveis. Um conflito exige nova prévia. Cancelar a aplicação mantém a conexão cadastrada.

Em **Modelos de junção**, duas áreas distinguem os escopos:

- **Modelos de junção da organização:** usados pelos relatórios da organização em qualquer fonte compatível. A fonte atual é referência para preenchimento e compatibilidade. Root pode cadastrar, editar, duplicar, consultar dependências e salvar como template global. Modelos em uso permitem editar nome e alias sugerido; estrutura, tipo, habilitação e exclusão ficam protegidos. Duplique para criar uma alternativa.
- **Templates globais de junção:** snapshots compartilhados entre organizações, consultáveis e aplicáveis com prévia para criar um modelo local independente. Para mudar o conteúdo, salve outro template. Excluir o template não altera os modelos já aplicados. Um conflito exige gerar nova prévia.

Junções são avançadas e opcionais, sem bloquear a configuração inicial da fonte. Modelos e templates não concedem permissões. Na importação de relatório global, a prévia mostra os modelos locais que serão reutilizados ou criados automaticamente. Essa exceção é permitida ao usuário autorizado a importar, sem liberar gerenciamento manual. Relatório e modelos necessários são gravados juntos; falhas desfazem toda a importação.

## Acesso, retomada e compatibilidade

Somente root cadastra conexões, tabelas, campos e modelos. Administradores mantêm as permissões existentes para consultar fontes e gerenciar profiles e grants. A API continua sendo a autoridade de autorização. Uma fonte deve pertencer à organização da URL.

A rota é /organizations/:organizationId/data-sources/:dataSourceId. Os parâmetros step (connection, tables, fields, access), schemaId e profileId permitem retomar o contexto e usar voltar/avançar do navegador. Credenciais ficam apenas no formulário transitório.

Links antigos de fontes, catálogo e modelos encaminham ao novo contexto quando informam dataSourceId ou schemaId. Links sem contexto exibem a escolha de organização e fonte. A navegação não cria outro catálogo. A transição das junções preserva as antigas definições compartilhadas como templates globais, sem remapear relatórios antigos; relatórios com junções antigas precisam ser ajustados ou recriados.

A execução dos relatórios exige conexão habilitada e validada como somente leitura, além de catálogo e permissões adequados. Preparar o catálogo pode ocorrer antes da validação.
