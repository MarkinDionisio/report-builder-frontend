# Orientações do frontend

## Interface e comportamento

- Antes de implementar ou alterar qualquer tela, leia e aplique [docs/ui-patterns.md](docs/ui-patterns.md). Esse é o padrão obrigatório para novas funcionalidades e alterações de interface em todo o projeto.
- Para telas da organização, consulte também [docs/organization-layout.md](docs/organization-layout.md); para fontes de dados, consulte [docs/data-source-configuration.md](docs/data-source-configuration.md).
- Reutilize componentes e estilos existentes. Ao tocar em uma tela, adeque a parte alterada ao padrão; não amplie a tarefa para uma revisão geral de telas sem solicitação.
- Inclua na validação a lista de verificação do guia e execute as verificações proporcionais à mudança. Informe o que foi validado e as limitações encontradas.
- Quando o usuário aprovar explicitamente um novo padrão, atualize o guia central. Não transforme uma escolha pontual em regra global sem essa aprovação.

Estas instruções são versionadas para orientar implementações futuras, inclusive em novas conversas e checkouts. Não substituem instruções explícitas do usuário nem autorizam commit, push ou publicação por si só.

## Junções e templates

- Relatórios usam modelos de junção da própria organização (`joinModelId`); templates globais são snapshots para criar modelos locais independentes. A fonte atual é referência, e um modelo local pode servir a outras fontes compatíveis da organização.
- Somente root gerencia manualmente. A importação autorizada de relatório global pode criar modelos locais automaticamente, sem conceder grants ou gerenciamento manual a creators/administradores. Mostrar os modelos planejados na prévia e preservar os aliases do relatório.
- Exibir dependências e restrições de modelos em uso e oferecer duplicação. Seguir [o fluxo da fonte](docs/data-source-configuration.md).
