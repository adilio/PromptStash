import { vi } from 'vitest';

export type MockSupabaseQuery = {
  select: ReturnType<typeof vi.fn>;
  insert?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
  delete?: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single?: ReturnType<typeof vi.fn>;
  maybeSingle?: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
};

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
