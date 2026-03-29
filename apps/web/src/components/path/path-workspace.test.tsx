import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PathWorkspace } from './path-workspace';
import { pathStorage } from '@/lib/client/path-storage';

// @vitest-environment jsdom

// Mock dependencies
vi.mock('@/lib/goals/goal-storage', () => ({
  goalStorage: {
    getGoals: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('@/lib/client/path-storage', () => ({
  pathStorage: {
    getAllPaths: vi.fn(),
    getPath: vi.fn(),
    updatePath: vi.fn(),
    createPath: vi.fn(),
  },
}));

vi.mock('./enhanced-path-editor', () => ({
  __esModule: true,
  default: ({ initialNodes = [], initialEdges = [], onSave }: any) => (
    <div data-testid="mock-enhanced-editor">
      <div data-testid="mock-node-count">{initialNodes.length}</div>
      <div data-testid="mock-edge-count">{initialEdges.length}</div>
      <button
        data-testid="mock-save"
        onClick={() =>
          onSave?.(
            [
              {
                id: 'task_2',
                data: {
                  label: '重命名节点',
                  description: 'updated',
                  estimatedTime: 45,
                  status: 'in_progress',
                  metadata: { documentBinding: { documentId: 'doc_2' } },
                },
              },
              {
                id: 'task_3',
                data: {
                  label: '占位节点',
                  description: '',
                  estimatedTime: 30,
                  status: 'not_started',
                  metadata: {},
                },
              },
            ] as any,
            [
              { source: 'task_2', target: 'task_3' },
            ] as any
          )
        }
      >
        save
      </button>
    </div>
  ),
}));

// ResizeObserver mock needed for Radix/ScrollArea
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('PathWorkspace', () => {
  const makePath = (id: string, title: string) => ({
    id,
    title,
    description: '',
    status: 'not_started',
    progress: 0,
    tags: [],
    createdAt: new Date('2026-03-24T00:00:00.000Z'),
    updatedAt: new Date('2026-03-24T00:00:00.000Z'),
    tasks: [
      {
        id: `${id}-task-1`,
        title: `${title} Task 1`,
        description: '',
        estimatedTime: '30m',
        progress: 0,
        status: 'not_started',
        dependencies: [],
        resources: [],
        notes: '',
        createdAt: new Date('2026-03-24T00:00:00.000Z'),
      },
    ],
    milestones: [],
    isPublic: false,
    difficulty: 'beginner',
    estimatedDuration: 30,
    version: 1,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders loading state initially', () => {
    // Make the promise unresolved initially to catch the loading state
    vi.mocked(pathStorage.getAllPaths).mockReturnValue(new Promise(() => {}));
    
    render(<PathWorkspace />);
    expect(screen.getByTestId('path-workspace-loading')).toBeTruthy();
  });

  it('renders empty state when no paths exist', async () => {
    vi.mocked(pathStorage.getAllPaths).mockResolvedValue([]);
    
    render(<PathWorkspace />);
    
    await waitFor(() => {
      expect(screen.getByTestId('path-workspace-loaded')).toBeTruthy();
    });
    
    expect(screen.getByTestId('path-workspace-empty')).toBeTruthy();
    // Editor should not be rendered
    expect(screen.queryByTestId('mock-enhanced-editor')).toBeFalsy();
    expect(screen.getByText('选择或新建一个学习路径开始编辑。')).toBeTruthy();
  });

  it('renders list and selects first path automatically', async () => {
    const mockPaths = [makePath('1', 'Path 1'), makePath('2', 'Path 2')] as any[];
    
    vi.mocked(pathStorage.getAllPaths).mockResolvedValue(mockPaths);
    
    render(<PathWorkspace />);
    
    await waitFor(() => {
      expect(screen.getByTestId('path-workspace-loaded')).toBeTruthy();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('path-item-1')).toBeTruthy();
      expect(screen.getByTestId('path-item-2')).toBeTruthy();
    });
    
    // Editor should be rendered for the selected path
    expect(screen.getByTestId('mock-enhanced-editor')).toBeTruthy();
    
    // Check if the first path is styled as selected
    expect(screen.getByTestId('path-item-1').className).toContain('bg-primary/10');
  });

  it('switches editor when selecting a different path', async () => {
    const mockPaths = [makePath('1', 'Path 1'), makePath('2', 'Path 2')] as any[];
    
    vi.mocked(pathStorage.getAllPaths).mockResolvedValue(mockPaths);
    
    render(<PathWorkspace />);
    
    await waitFor(() => {
      expect(screen.getByTestId('path-item-1')).toBeTruthy();
    });
    
    // Click second path
    fireEvent.click(screen.getByTestId('path-item-2'));
    
    await waitFor(() => {
      // Check selection style
      expect(screen.getByTestId('path-item-2').className).toContain('bg-primary/10');
    });
    
    expect(screen.getByTestId('path-item-1').className).not.toContain('bg-primary/10');
    
    // Editor should still be rendered
    expect(screen.getByTestId('mock-enhanced-editor')).toBeTruthy();
  });

  it('passes selected path data into the editor and saves node edits back to storage', async () => {
    const mockPaths = [
      {
        id: 'path-1',
        title: 'Path 1',
        description: 'desc',
        status: 'not_started',
        progress: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [
          {
            id: 'task_1',
            title: 'Old title',
            description: '',
            estimatedTime: '30m',
            progress: 0,
            status: 'not_started',
            dependencies: [],
            resources: [],
            notes: '',
            createdAt: new Date(),
            documentBinding: {
              documentId: 'doc_1',
              boundAt: new Date(),
              draft: {
                draftId: 'draft_1',
                draftTitle: 'Draft 1',
                draftContent: 'draft body',
                updatedAt: new Date(),
              },
            },
          },
        ],
        milestones: [],
        isPublic: false,
        difficulty: 'beginner',
        estimatedDuration: 30,
        version: 1,
      },
    ] as any[];

    vi.mocked(pathStorage.getAllPaths).mockResolvedValue(mockPaths);
    const updatePathMock = vi.mocked(pathStorage.updatePath).mockResolvedValue({ ...mockPaths[0], tasks: [] } as any);

    render(<PathWorkspace />);

    await waitFor(() => expect(screen.getByTestId('mock-enhanced-editor')).toBeTruthy());
    expect(screen.getByTestId('mock-node-count').textContent).toBe('1');
    expect(screen.getByTestId('mock-edge-count').textContent).toBe('0');

    fireEvent.click(screen.getByTestId('mock-save'));

    expect(updatePathMock).toHaveBeenCalledWith('path-1', expect.objectContaining({
      tasks: expect.arrayContaining([
        expect.objectContaining({
          id: 'task_2',
          title: '重命名节点',
          documentBinding: expect.objectContaining({ documentId: 'doc_2' }),
        }),
        expect.objectContaining({
          id: 'task_3',
          title: '占位节点',
          documentBinding: undefined,
        }),
      ]),
      deletedDocumentDrafts: expect.arrayContaining([
        expect.objectContaining({
          draftId: 'draft_1',
          draftTitle: 'Draft 1',
          draftContent: 'draft body',
        }),
      ]),
    }));
  });

  it('opens create dialog, creates a new path and selects it', async () => {
    vi.mocked(pathStorage.getAllPaths).mockResolvedValue([]);
    const newPath = makePath('new-path-1', 'New Test Path');
    vi.mocked(pathStorage.createPath).mockImplementation(async (data) => {
      vi.mocked(pathStorage.getAllPaths).mockResolvedValue([newPath as any]);
      return newPath as any;
    });

    render(<PathWorkspace />);
    
    await waitFor(() => {
      expect(screen.getByTestId('path-workspace-loaded')).toBeTruthy();
    });

    const newPathBtn = screen.getByTitle('新建路径');
    fireEvent.click(newPathBtn);

    const titleInput = await screen.findByLabelText('路径名称 *');
    expect(titleInput).toBeTruthy();

    fireEvent.change(titleInput, { target: { value: 'New Test Path' } });
    
    const submitBtn = screen.getByRole('button', { name: '创建路径' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(pathStorage.createPath).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Test Path',
        status: 'not_started',
        progress: 0,
        tasks: [],
        milestones: []
      }));
    });

    await waitFor(() => {
      const selectedItem = screen.getByTestId('path-item-new-path-1');
      expect(selectedItem).toBeTruthy();
      expect(selectedItem.className).toContain('bg-primary/10');
    });
  });
});
