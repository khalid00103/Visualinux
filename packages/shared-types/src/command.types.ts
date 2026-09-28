// Mirrors API Design §7 (Commands API).

export interface CommandSummary {
  name: string;
  category: string;
  difficulty: string;
  shortDescription: string;
  iconKey: string;
}

export interface CommandFlagSummary {
  flag: string;
  description: string;
}

export interface CommandDetail {
  name: string;
  longDescription: string | null;
  exampleUsage: string;
  animationType: string;
  flags: CommandFlagSummary[];
}

export interface AutocompleteSuggestion {
  name: string;
  iconKey: string;
  shortDescription: string;
  exampleUsage: string;
  difficulty: string;
  category: string;
}
