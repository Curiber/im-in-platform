// Etiquetas presentacionales de rol y tipo de organizacion, compartidas entre
// el page server y los formularios client.

export function formatRole(role: "owner" | "admin" | "event_admin") {
  const labels = {
    owner: "Owner",
    admin: "Admin",
    event_admin: "Admin de evento",
  } as const;

  return labels[role];
}

export function formatOrganizationType(type: string) {
  const labels: Record<string, string> = {
    university: "Universidad",
    company: "Empresa",
    foundation: "Fundacion",
    guild: "Gremio",
    incubator: "Incubadora",
    community: "Comunidad",
    producer: "Productora",
    public_institution: "Institucion publica",
    other: "Organizacion",
  };

  return labels[type] ?? "Organizacion";
}
