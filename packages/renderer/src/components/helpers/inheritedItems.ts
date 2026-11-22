const INHERITED_COLORS = [
  '#e8f5e9',
  '#fff3e0',
  '#f3e5f5',
  '#e0f7fa',
  '#fce4ec',
  '#f1f8e9',
];

interface InheritedItemHelpersOptions {
  removed: () => readonly string[] | undefined;
  provenance: () => Record<string, string> | undefined;
  updateRemoved: (removed: string[]) => void;
}

export function createInheritedItemHelpers({
  removed,
  provenance,
  updateRemoved,
}: InheritedItemHelpersOptions) {
  const inheritedSource = (name: string): string => provenance()?.[name] || '';

  return {
    isRemoved: (name: string): boolean => removed()?.includes(name) ?? false,
    inheritedSource,
    inheritedBackground: (name: string): string | undefined => {
      const source = inheritedSource(name);
      if (!source) return undefined;
      const sources = [...new Set(Object.values(provenance() || {}))];
      return INHERITED_COLORS[
        Math.max(0, sources.indexOf(source) % INHERITED_COLORS.length)
      ];
    },
    setRemoved: (name: string, value: boolean | null): void => {
      const names = new Set(removed() || []);
      if (value) names.add(name);
      else names.delete(name);
      updateRemoved([...names]);
    },
  };
}
