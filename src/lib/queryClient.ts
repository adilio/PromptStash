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
