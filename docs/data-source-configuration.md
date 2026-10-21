# Configurar fontes de dados

Acesse **Organizações → organização → Fontes de dados → Configurar fonte**. Fontes sem tabelas também aparecem na lista. O cabeçalho mantém a organização e a fonte visíveis.

1. **Conectar o banco:** cadastre uma conexão na organização escolhida. Use Testar conexão antes de salvar. O teste não substitui a validação persistida: consulte o estado em Conectar o banco e use Validar somente leitura. A fonte salva ainda não disponibiliza tabelas nem concede acesso.
2. **Escolher tabelas:** use Importar do banco para buscar tabelas/views, selecionar resultados e revisar a prévia. A importação cadastra tabelas e campos; não copia dados. Cada tabela possui resultado individual. Em falhas parciais, repita somente as falhas. Usar modelo de catálogo só funciona com catálogo vazio; fontes com catálogo existente podem acrescentar tabelas pela importação. O cadastro manual está em Opções avançadas.
3. **Revisar os campos:** escolha uma tabela para editar nomes públicos, habilitação, sensibilidade, operações, operadores e agregações. A busca oferece Aa e expressão exata. Filtros ficam no botão Filtros; use Selecionar para exibir as caixas e ações em lote. No celular, use Opções da tabela → Trocar tabela para abrir a lista. A paginação e a seleção em lote facilitam catálogos grandes. Marcar resultados inclui todas as páginas do filtro atual; as ações em lote também abrangem seleções mantidas em outros filtros. Campos existentes não significam que houve revisão humana. Estas configurações limitam o que poderá ser concedido aos membros.
4. **Definir acesso:** escolha ou crie um profile da organização e configure suas permissões com a fonte já selecionada. Os grants das demais fontes são preservados; nenhuma permissão é concedida automaticamente. Se a leitura dos grants falhar, o editor bloqueia alterações até uma nova consulta. Associe os membros ao profile. O resumo final mostra conexão, validação de leitura, tabelas, campos e estado das permissões. Use o acesso à criação de relatórios para continuar.

## Modelos reutilizáveis

Na fonte, abra **Mais opções → Modelos reutilizáveis**. A biblioteca é global e compartilhada entre organizações. Modelos de catálogo guardam cópias independentes das configurações de tabelas e campos, sem credenciais ou permissões. Excluir um modelo não remove cópias já aplicadas. Salvar catálogo como modelo exige campos cadastrados. A aplicação faz introspecção e permite selecionar somente itens compatíveis. Um conflito exige nova prévia. Cancelar a aplicação mantém a conexão cadastrada.

Modelos de relacionamento descrevem como combinar tabelas nos relatórios. São uma configuração avançada e opcional; mudanças nesses modelos globais podem afetar outras fontes com os mesmos nomes internos.

## Acesso, retomada e compatibilidade

Somente root cadastra conexões, tabelas, campos e modelos. Administradores mantêm as permissões existentes para consultar fontes e gerenciar profiles e grants. A API continua sendo a autoridade de autorização. Uma fonte deve pertencer à organização da URL.

A rota é /organizations/:organizationId/data-sources/:dataSourceId. Os parâmetros step (connection, tables, fields, access), schemaId e profileId permitem retomar o contexto e usar voltar/avançar do navegador. Credenciais ficam apenas no formulário transitório.

Links antigos de fontes, catálogo e modelos encaminham ao novo contexto quando informam dataSourceId ou schemaId. Links sem contexto exibem a escolha de organização e fonte. Nenhum catálogo adicional ou migração de dados foi criado.

A execução dos relatórios exige conexão habilitada e validada como somente leitura, além de catálogo e permissões adequados. Preparar o catálogo pode ocorrer antes da validação.
