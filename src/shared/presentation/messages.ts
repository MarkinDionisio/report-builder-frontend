import type { ApiProblemDetails } from "../api/types";

export const KNOWN_ERROR_CODES: Record<string, { title: string; message: string }> = {
  "export.global_template": { title: "Importação necessária", message: "Importe este modelo global para sua organização antes de exportar." },
  "report_import.incompatible": { title: "Modelo incompatível", message: "O modelo ou catálogo mudou. Verifique a compatibilidade novamente." },
  "report_import.forbidden": { title: "Importação não permitida", message: "É necessário acesso de creator à organização para importar relatórios." },
  "report_import.template_not_found": { title: "Modelo indisponível", message: "Este modelo global não está mais disponível. Escolha outro modelo." },
  "report_import.data_source_not_found": { title: "Data source indisponível", message: "O data source não está mais disponível nesta organização." },
  "report_import.organization_not_found": { title: "Organização indisponível", message: "A organização de destino não está mais disponível." },
  "report_import.connection_failed": { title: "Erro de conexão", message: "Não foi possível concluir. Tente novamente." },
  "report_execution.global_template_requires_import": { title: "Importação necessária", message: "Importe este modelo global para sua organização antes de executar." },
  "reports.edit_access_blocked": {
    title: "Edição bloqueada",
    message: "O acesso aos schemas ou campos deste relatório mudou. Recarregue a página ou solicite as permissões necessárias a um administrador.",
  },
  // Auth
  "auth.invalid_credentials": {
    title: "Credenciais Inválidas",
    message: "E-mail ou senha incorretos. Verifique os dados informados.",
  },
  "auth.email_exists": {
    title: "E-mail Já Cadastrado",
    message: "Este endereço de e-mail já está em uso na plataforma.",
  },
  "auth.password_invalid": {
    title: "Senha Inválida",
    message: "A senha deve conter no mínimo 8 caracteres.",
  },
  "auth.refresh_token_required": {
    title: "Sessão Expirada",
    message: "Sua sessão expirou. Por favor, faça login novamente.",
  },
  "auth.refresh_token_invalid": {
    title: "Sessão Expirada",
    message: "Sua sessão expirou. Por favor, faça login novamente.",
  },
  "auth.invitation_token_required": {
    title: "Token de Convite Obrigatório",
    message: "O token de convite deve ser fornecido para continuar.",
  },
  "auth.invitation_not_found": {
    title: "Convite Não Encontrado",
    message: "O convite solicitado não foi localizado.",
  },
  "auth.invitation_not_pending": {
    title: "Convite Indisponível",
    message: "Este convite já foi aceito ou revogado anteriormente.",
  },
  "auth.invitation_expired": {
    title: "Convite Expirado",
    message: "Este convite expirou. Solicite um novo convite ao administrador.",
  },
  "auth.user_has_credentials": {
    title: "Usuário Já Possui Credenciais",
    message: "Esta conta já possui senha cadastrada. Por favor, faça login.",
  },

  // Organizations
  "organizations.name_required": {
    title: "Nome Obrigatório",
    message: "O nome da organização é obrigatório.",
  },
  "organizations.name_conflict": {
    title: "Nome em Uso",
    message: "Já existe uma organização cadastrada com este nome.",
  },
  "organizations.time_zone_invalid": { title: "Fuso Inválido", message: "Selecione um identificador de fuso horário IANA válido." },
  "report_parameters.required_missing": { title: "Parâmetro Obrigatório", message: "Preencha todos os parâmetros obrigatórios antes de executar." },
  "report_parameters.unknown": { title: "Parâmetro Desconhecido", message: "A execução contém um parâmetro que não pertence ao relatório." },
  "report_parameters.override_not_allowed": { title: "Substituição Não Permitida", message: "Uma variável automática não permite substituição manual." },
  "report_parameters.type_invalid": { title: "Valor Inválido", message: "Um parâmetro possui valor incompatível com seu tipo." },
  "report_definition.parameter_reference_invalid": { title: "Referência Inválida", message: "Um filtro referencia um parâmetro inexistente ou incompatível." },
  "organizations.not_found": {
    title: "Organização Não Encontrada",
    message: "A organização solicitada não foi encontrada.",
  },
  "organizations.email_required": {
    title: "E-mail Obrigatório",
    message: "O endereço de e-mail é obrigatório.",
  },
  "organizations.user_not_found": {
    title: "Usuário Não Encontrado",
    message: "Nenhuma conta global foi localizada com este e-mail.",
  },
  "organizations.user_id_required": {
    title: "Usuário Obrigatório",
    message: "Nenhum usuário foi selecionado.",
  },
  "organizations.member_already_exists": {
    title: "Membro Já Cadastrado",
    message: "Este usuário já é membro desta organização.",
  },
  "organizations.membership_not_found": {
    title: "Membro Não Encontrado",
    message: "O vínculo deste membro não foi localizado.",
  },
  "organizations.role_required": {
    title: "Papel Obrigatório",
    message: "O papel na organização é obrigatório.",
  },
  "organizations.invalid_role": {
    title: "Papel Inválido",
    message: "O papel selecionado é inválido.",
  },
  "organizations.root_access_required": {
    title: "Acesso Restrito",
    message: "Esta ação requer acesso Root.",
  },
  "organizations.member_view_forbidden": {
    title: "Acesso Negado",
    message: "Você não possui permissão para visualizar os membros desta organização.",
  },
  "organizations.member_management_forbidden": {
    title: "Acesso Negado",
    message: "Você não possui permissão para gerenciar membros nesta organização.",
  },
  "organizations.administrator_assignment_forbidden": {
    title: "Permissão Insuficiente",
    message: "Apenas usuários Root podem atribuir o papel Administrador.",
  },
  "organizations.target_user_management_forbidden": {
    title: "Permissão Insuficiente",
    message: "Você não possui permissão para gerenciar este usuário.",
  },

  // Invitations
  "invitations.email_required": {
    title: "E-mail Obrigatório",
    message: "O e-mail é obrigatório para enviar o convite.",
  },
  "invitations.role_required": {
    title: "Papel Obrigatório",
    message: "O papel do convite é obrigatório.",
  },
  "invitations.invalid_role": {
    title: "Papel Inválido",
    message: "O papel selecionado para o convite é inválido.",
  },
  "invitations.pending_already_exists": {
    title: "Convite Já Pendente",
    message: "Já existe um convite pendente ativo para este e-mail nesta organização.",
  },
  "invitations.user_already_member": {
    title: "Usuário Já Membro",
    message: "Este usuário já é membro ativo da organização.",
  },
  "invitations.revoke_not_pending": {
    title: "Ação Não Permitida",
    message: "Apenas convites com status pendente podem ser revogados.",
  },
  "invitations.assign_administrator_forbidden": {
    title: "Permissão Insuficiente",
    message: "Apenas usuários Root podem convidar com o papel Administrador.",
  },
  "invitations.manage_target_forbidden": {
    title: "Acesso Negado",
    message: "Você não possui permissão sobre esta conta.",
  },
  "invitations.organization_management_forbidden": {
    title: "Acesso Negado",
    message: "Você não possui permissão para gerenciar esta organização.",
  },

  // Users Global Role
  "users.not_found": {
    title: "Usuário Não Encontrado",
    message: "O usuário solicitado não foi localizado.",
  },
  "users.invalid_role": {
    title: "Papel Global Inválido",
    message: "O papel global informado é inválido.",
  },
  "users.root_access_required": {
    title: "Acesso Restrito",
    message: "Apenas usuários Root podem alterar o papel global de usuários.",
  },
  "export.format_invalid": { title: "Não foi possível concluir", message: "Selecione Excel ou CSV para exportar." },
  "export.parameters_invalid": { title: "Não foi possível concluir", message: "Verifique os parâmetros e filtros informados." },
  "export.queue_limit": { title: "Não foi possível concluir", message: "O limite de exportações pendentes foi atingido. Tente novamente em instantes." },
  "export.expired": { title: "Não foi possível concluir", message: "Arquivo expirado. Solicite uma nova exportação." },
  "export.not_ready": { title: "Não foi possível concluir", message: "O arquivo ainda não está disponível." },
  "export.file_unavailable": { title: "Não foi possível concluir", message: "Arquivo indisponível. Solicite uma nova exportação." },
  "export.report_not_found": { title: "Não foi possível concluir", message: "Relatório indisponível ou sem acesso." },
  "export.access_denied": { title: "Não foi possível concluir", message: "Você não tem permissão para exportar este relatório." },
  "pagination.invalid": { title: "Não foi possível concluir", message: "Verifique a página e a quantidade de itens solicitada." },
  "reports.description_too_long": { title: "Não foi possível concluir", message: "A descrição deve ter no máximo 2.000 caracteres." },
  "reports.tags_invalid": { title: "Não foi possível concluir", message: "Selecione etiquetas existentes desta organização." },
  "report_tags.name_invalid": { title: "Não foi possível concluir", message: "Informe um nome de até 100 caracteres." },
  "report_tags.name_conflict": { title: "Não foi possível concluir", message: "Já existe uma etiqueta com esse nome nesta organização." },
  "report_tags.manage_forbidden": { title: "Não foi possível concluir", message: "Somente root e administradores podem gerenciar etiquetas." },
  "join_model.root_required": { title: "Não foi possível concluir", message: "Somente root pode gerenciar modelos e templates de junção." },
  "join_model.organization_not_found": { title: "Não foi possível concluir", message: "Organização não encontrada." },
  "join_model.not_found": { title: "Não foi possível concluir", message: "Modelo de junção não encontrado nesta organização." },
  "join_model.invalid_request": { title: "Não foi possível concluir", message: "Preencha nome, alias, tabelas e campos válidos e escolha LEFT ou INNER." },
  "join_model.name_conflict": { title: "Não foi possível concluir", message: "Já existe um modelo com este nome na organização." },
  "join_model.incompatible": { title: "Não foi possível concluir", message: "A junção não é compatível com as fontes da organização." },
  "join_model.in_use": { title: "Não foi possível concluir", message: "Este modelo é utilizado por relatórios. Consulte as dependências ou duplique-o para criar uma alternativa." },
  "join_template.not_found": { title: "Não foi possível concluir", message: "Template global não encontrado." },
  "join_template.invalid_request": { title: "Não foi possível concluir", message: "Informe um nome de até 200 caracteres e descrição de até 2000 caracteres." },
  "join_template.incompatible": { title: "Não foi possível concluir", message: "O template não é compatível. Verifique os diagnósticos e gere uma nova prévia." },
  "report_execution.order_by_ignored": { title: "Não foi possível concluir", message: "Um item de ordenação incompatível com a consulta foi ignorado." },
  "tags_invalid": { title: "Não foi possível concluir", message: "Selecione etiquetas existentes da organização de destino." },
  "unsupported_definition": { title: "Não foi possível concluir", message: "Somente relatórios declarativos V1 podem ser importados." },
  "schema_unavailable_or_ambiguous": { title: "Não foi possível concluir", message: "Objeto ausente ou ambíguo no catálogo de destino." },
  "source_field_unavailable": { title: "Não foi possível concluir", message: "Campo de origem indisponível." },
  "field_incompatible": { title: "Não foi possível concluir", message: "Campo ausente, ambíguo ou com tipo incompatível no destino." },
  "source_schema_unavailable": { title: "Não foi possível concluir", message: "Objeto de origem indisponível." },
  "invalid_field_reference": { title: "Não foi possível concluir", message: "Referência de campo inválida." },
  "invalid_filter_reference": { title: "Não foi possível concluir", message: "Filtro sem referência válida ao catálogo." },
  "join_unavailable": { title: "Não foi possível concluir", message: "Modelo de junção da organização de origem indisponível." },
  "join_incompatible": { title: "Não foi possível concluir", message: "A junção não é compatível com as tabelas e campos habilitados da fonte de destino." },
  "join_field_unavailable": { title: "Não foi possível concluir", message: "Campo necessário à junção indisponível." },
  "filter_unavailable": { title: "Não foi possível concluir", message: "Filtro indisponível com as permissões do destino." },
  "catalog_template.object_missing": { title: "Não foi possível concluir", message: "Tabela ou view ausente no destino." },
  "catalog_template.field_missing": { title: "Não foi possível concluir", message: "Campo ausente no destino." },
  "catalog_template.type_incompatible": { title: "Não foi possível concluir", message: "Tipo incompatível no destino." },
  "join_template.source_unavailable": { title: "Não foi possível concluir", message: "Fonte desabilitada ou não pertencente à organização." },
  "join_template.field_unavailable": { title: "Não foi possível concluir", message: "Tabela ou campo ausente ou desabilitado na fonte." },
  "join_template.types_incompatible": { title: "Não foi possível concluir", message: "Tipos dos campos de junção incompatíveis." },
  "join_template.same_endpoint": { title: "Não foi possível concluir", message: "Os dois lados da junção devem ser diferentes." },
  "join_template.name_invalid": { title: "Não foi possível concluir", message: "Informe o nome do modelo local, com até 200 caracteres." },
};

/** Technical response text is deliberately never used as presentation fallback. */
export function problemMessage(problem: Partial<ApiProblemDetails> | null | undefined, fallback = "Não foi possível concluir a ação. Tente novamente."): string {
  if (problem?.code && Object.hasOwn(KNOWN_ERROR_CODES, problem.code)) return KNOWN_ERROR_CODES[problem.code].message;
  if (problem?.status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (problem?.status === 403) return "Você não possui permissão para realizar esta ação.";
  return fallback;
}
export function diagnosticMessage(code?: string | null, fallback = "A configuração não é compatível. Revise os itens selecionados."): string {
  return code && Object.hasOwn(KNOWN_ERROR_CODES, code) ? KNOWN_ERROR_CODES[code].message : fallback;
}
const fieldLabels: Record<string, string> = { name: "Nome", email: "E-mail", password: "Senha", title: "Título", description: "Descrição", format: "Formato", parameters: "Parâmetros", filters: "Filtros", organizationid: "Organização", datasourceid: "Fonte de dados", role: "Papel", token: "Token", content: "Conteúdo", refreshtoken: "Sessão", newrole: "Papel", page: "Página", pagesize: "Itens por página" };
export function validationFieldLabel(field: string): string {
  const key = field.split(".").at(-1)?.toLowerCase() ?? "";
  return Object.hasOwn(fieldLabels, key) ? fieldLabels[key] : "Campo informado";
}
