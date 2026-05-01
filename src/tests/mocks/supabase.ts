import { vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockSupabaseQuery = any;

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
