import { vi } from 'vitest';

// Allow any object shape for test mocks since Supabase query building uses chaining
export type MockSupabaseQuery = Record<string, unknown>;

export type MockUser = {
  id: string;
};

export function createMockQuery(): MockSupabaseQuery {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };
}
