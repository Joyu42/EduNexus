import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PathWorkspace } from './path-workspace';
import { pathStorage } from '@/lib/client/path-storage';

// @vitest-environment jsdom

// Mock dependencies
vi.mock('@/lib/client/path-storage', () => ({
  pathStorage: {
    getAllPaths: vi.fn(),
    getPath: vi.fn(),
  },
}));

vi.mock('./enhanced-path-editor', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-enhanced-editor">Mock Editor</div>
}));

// ResizeObserver mock needed for Radix/ScrollArea
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('PathWorkspace', () => {
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
    const mockPaths = [
      { id: '1', title: 'Path 1' },
      { id: '2', title: 'Path 2' },
    ] as any[];
    
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
    const mockPaths = [
      { id: '1', title: 'Path 1' },
      { id: '2', title: 'Path 2' },
    ] as any[];
    
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
});
