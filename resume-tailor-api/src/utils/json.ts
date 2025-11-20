const CODE_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)\s*```/i;

const tryParse = <T>(candidate: string): T | undefined => {
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return undefined;
  }
};

const collectCandidates = (payload: string): string[] => {
  const trimmed = payload.trim();
  const candidates = [trimmed];

  const fenced = trimmed.match(CODE_FENCE_PATTERN);
  if (fenced?.[1]) {
    candidates.push(fenced[1].trim());
  }

  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    candidates.push(trimmed.slice(braceStart, braceEnd + 1).trim());
  }

  const bracketStart = trimmed.indexOf('[');
  const bracketEnd = trimmed.lastIndexOf(']');
  if (bracketStart !== -1 && bracketEnd !== -1 && bracketEnd > bracketStart) {
    candidates.push(trimmed.slice(bracketStart, bracketEnd + 1).trim());
  }

  return candidates.filter(Boolean);
};

export const parseJsonResponse = <T>(payload: string | undefined | null): T | undefined => {
  if (!payload) {
    return undefined;
  }

  const trimmed = payload.trim();
  if (!trimmed) {
    return undefined;
  }

  const candidates = collectCandidates(trimmed);

  for (const candidate of candidates) {
    const parsed = tryParse<T>(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  return undefined;
};
