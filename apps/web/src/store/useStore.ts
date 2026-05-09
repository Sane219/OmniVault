"use client"
import { create } from 'zustand'

export interface SelectedNode {
  id: string;
  label: string;
  type?: string;
}

interface StoreState {
  accessToken: string | null;
  userEmail: string | null;
  activeDocument: string | null;
  selectedNode: SelectedNode | null;
  setAccessToken: (token: string | null) => void;
  setUserEmail: (email: string | null) => void;
  setActiveDocument: (doc: string | null) => void;
  setSelectedNode: (node: SelectedNode | null) => void;
}

export const useStore = create<StoreState>((set) => ({
  accessToken: null,
  userEmail: null,
  activeDocument: null,
  selectedNode: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUserEmail: (email) => set({ userEmail: email }),
  setActiveDocument: (doc) => set({ activeDocument: doc, selectedNode: null }),
  setSelectedNode: (node) => set({ selectedNode: node }),
}))
