'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isCollapsed: boolean
  toggleCollapse: () => void
  setCollapsed: (collapsed: boolean) => void

  workspaceLeftCollapsed: boolean
  workspaceRightCollapsed: boolean
  setWorkspaceLeftCollapsed: (collapsed: boolean) => void
  setWorkspaceRightCollapsed: (collapsed: boolean) => void
  toggleWorkspaceLeftCollapsed: () => void
  toggleWorkspaceRightCollapsed: () => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),

      workspaceLeftCollapsed: false,
      workspaceRightCollapsed: false,
      setWorkspaceLeftCollapsed: (collapsed) => set({ workspaceLeftCollapsed: collapsed }),
      setWorkspaceRightCollapsed: (collapsed) => set({ workspaceRightCollapsed: collapsed }),
      toggleWorkspaceLeftCollapsed: () =>
        set((state) => ({ workspaceLeftCollapsed: !state.workspaceLeftCollapsed })),
      toggleWorkspaceRightCollapsed: () =>
        set((state) => ({ workspaceRightCollapsed: !state.workspaceRightCollapsed })),
    }),
    { name: 'edunexus-sidebar' }
  )
)
