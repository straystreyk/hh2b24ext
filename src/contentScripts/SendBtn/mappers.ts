// mappers.ts
export type Option = { label: string; value: string };

export function mapVacancyOptions(pages: any[]): Option[] {
  return pages
    .flatMap((p) => p?.result?.items ?? [])
    .map((it: any) => ({
      value: /*String(it.id) */ it.title,
      label: it.title,
    }));
}

export function mapRecruiterOptions(pages: any[]): Option[] {
  return pages
    .flatMap((p) => p?.result ?? [])
    .map((u: any) => {
      const id = String(u.ID ?? u.id);
      const name = [u.NAME ?? u.name, u.LAST_NAME ?? u.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      const label = name || u.EMAIL || `ID ${id}`;
      return {
        value: /*id*/ label,
        label,
      };
    });
}
