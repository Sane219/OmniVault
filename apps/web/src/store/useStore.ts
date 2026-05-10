"use client"
import { create } from 'zustand'

export interface SelectedNode {
  id: string;
  label: string;
  type?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface StoreState {
  accessToken: string | null;
  userEmail: string | null;
  activeDocument: string | null;
  selectedNode: SelectedNode | null;
  chatMessages: ChatMessage[];
  setAccessToken: (token: string | null) => void;
  setUserEmail: (email: string | null) => void;
  setActiveDocument: (doc: string | null) => void;
  setSelectedNode: (node: SelectedNode | null) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  clearChatMessages: () => void;
}

export const useStore = create<StoreState>((set) => ({
  accessToken: null,
  userEmail: null,
  activeDocument: null,
  selectedNode: null,
  chatMessages: [],
  setAccessToken: (token) => set({ accessToken: token }),
  setUserEmail: (email) => set({ userEmail: email }),
  setActiveDocument: (doc) => set({ activeDocument: doc, selectedNode: null, chatMessages: [] }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  clearChatMessages: () => set({ chatMessages: [] }),
}))
