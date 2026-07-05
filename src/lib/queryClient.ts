import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export const promptKeys = {
  all: ['prompts'] as const,
  lists: () => [...promptKeys.all, 'list'] as const,
  list: (teamId?: string, searchQuery?: string) =>
    [...promptKeys.lists(), teamId ?? null, searchQuery ?? ''] as const,
  details: () => [...promptKeys.all, 'detail'] as const,
  detail: (promptId?: string) => [...promptKeys.details(), promptId ?? null] as const,
};

export const bundleKeys = {
  all: ['bundles'] as const,
  lists: () => [...bundleKeys.all, 'list'] as const,
  list: (teamId?: string) =>
    [...bundleKeys.lists(), teamId ?? null] as const,
  details: () => [...bundleKeys.all, 'detail'] as const,
  detail: (bundleId?: string) => [...bundleKeys.details(), bundleId ?? null] as const,
};

export const runKeys = {
  all: ['prompt-runs'] as const,
  lists: () => [...runKeys.all, 'list'] as const,
  list: (promptId?: string) => [...runKeys.lists(), promptId ?? null] as const,
};

export const patternKeys = {
  all: ['workflow-patterns'] as const,
  list: (teamId?: string) => [...patternKeys.all, teamId ?? null] as const,
};
