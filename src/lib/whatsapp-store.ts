import { create } from "zustand";

interface WhatsAppState {
  phone: string | null;
  title: string | null;
  setWhatsAppData: (phone: string | null, title: string | null) => void;
  clearWhatsAppData: () => void;
}

export const useWhatsAppStore = create<WhatsAppState>((set) => ({
  phone: null,
  title: null,
  setWhatsAppData: (phone, title) => set({ phone, title }),
  clearWhatsAppData: () => set({ phone: null, title: null }),
}));
