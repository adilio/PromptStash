import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatternPicker, type WorkflowSelection } from '@/components/PatternPicker';

vi.mock('@/api/patterns', () => ({
  QRSPI_PATTERN_ID: 'qrspi-id',
  listPatterns: vi.fn().mockResolvedValue([
    {
      id: 'qrspi-id',
      name: 'QRSPI',
      is_system: true,
      team_id: null,
      steps: [
        { id: 'step-r', pattern_id: 'qrspi-id', key: 'research', label: 'Research', position: 1 },
        { id: 'step-p', pattern_id: 'qrspi-id', key: 'plan', label: 'Plan', position: 2 },
      ],
    },
    {
      id: 'team-pattern',
      name: 'Discovery flow',
      is_system: false,
      team_id: 'team-1',
      steps: [
        { id: 'step-d', pattern_id: 'team-pattern', key: 'discovery', label: 'Discovery', position: 1 },
      ],
    },
  ]),
}));

vi.mock('@/components/ConceptInfo', () => ({
  ConceptInfo: () => null,
}));

function renderPicker(value: WorkflowSelection, onChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PatternPicker teamId="team-1" value={value} onChange={onChange} />
    </QueryClientProvider>
  );
  return onChange;
}

describe('PatternPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to "No workflow label"', async () => {
    renderPicker({ patternId: null, stepId: null, label: null });
    expect(screen.getByRole('option', { name: 'No workflow label' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'QRSPI' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Discovery flow' })).toBeInTheDocument();
    });
  });

  it('selecting a pattern step reports pattern, step, and label', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <PatternPicker teamId="team-1" value={{ patternId: null, stepId: null, label: null }} onChange={onChange} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'QRSPI' })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText(/Workflow label/), 'qrspi-id');
    expect(onChange).toHaveBeenCalledWith({ patternId: 'qrspi-id', stepId: null, label: null });

    rerender(
      <QueryClientProvider client={queryClient}>
        <PatternPicker teamId="team-1" value={{ patternId: 'qrspi-id', stepId: null, label: null }} onChange={onChange} />
      </QueryClientProvider>
    );
    await user.selectOptions(screen.getByLabelText('Workflow step'), 'step-p');
    expect(onChange).toHaveBeenCalledWith({ patternId: 'qrspi-id', stepId: 'step-p', label: 'Plan' });
  });

  it('custom label mode stores a label with no pattern', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <PatternPicker teamId="team-1" value={{ patternId: null, stepId: null, label: null }} onChange={onChange} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Custom label…' })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText(/Workflow label/), '__custom__');
    expect(onChange).toHaveBeenCalledWith({ patternId: null, stepId: null, label: '' });

    rerender(
      <QueryClientProvider client={queryClient}>
        <PatternPicker teamId="team-1" value={{ patternId: null, stepId: null, label: '' }} onChange={onChange} />
      </QueryClientProvider>
    );
    await user.type(screen.getByLabelText('Custom workflow label'), 'D');
    expect(onChange).toHaveBeenCalledWith({ patternId: null, stepId: null, label: 'D' });
  });
});
