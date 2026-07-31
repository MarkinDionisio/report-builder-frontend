import type { MeResponse } from "../../../shared/api/types";

export function canOpenCreatorWorkspace(
  me: MeResponse | null | undefined,
  organizationId: string,
): boolean {
  if (!me) return false;
  if (["root", "administrator", "creator"].includes(me.globalRole)) return true;

  const membership = me.organizations.find(item => item.id === organizationId);
  return membership?.organizationRole === "administrator" || membership?.organizationRole === "creator";
}
