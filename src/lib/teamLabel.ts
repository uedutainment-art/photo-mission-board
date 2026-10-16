export function getParticipantName(team: { name: string; displayName?: string }): string {
  return team.displayName?.trim() || team.name;
}

export function getTeamLabel(team: { name: string; displayName?: string }): string {
  return team.displayName && team.displayName !== team.name
    ? `${team.name} · ${team.displayName}`
    : team.name;
}
