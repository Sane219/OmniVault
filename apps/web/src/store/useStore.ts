"use client"
import { create } from 'zustand'

interface StoreState {
  accessToken: string | null;
  userEmail: string | null;
  activeDocument: string | null;
  setAccessToken: (token: string | null) => void;
  setUserEmail: (email: string | null) => void;
  setActiveDocument: (doc: string | null) => void;
}

export const useStore = create<StoreState>((set) => ({
  accessToken: null,
  userEmail: null,
  activeDocument: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUserEmail: (email) => set({ userEmail: email }),
  setActiveDocument: (doc) => set({ activeDocument: doc }),
}))
