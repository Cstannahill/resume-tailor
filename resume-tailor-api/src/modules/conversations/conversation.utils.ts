export interface SessionInsightsState {
  focusAreas?: string[];
}

export const extractFocusAreasFromInsights = (insights: unknown): string[] => {
  if (!insights || typeof insights !== 'object') {
    return [];
  }

  const parsed = insights as SessionInsightsState;
  return Array.isArray(parsed.focusAreas)
    ? parsed.focusAreas.filter((area): area is string => typeof area === 'string')
    : [];
};
