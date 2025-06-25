import { vi } from 'vitest';

export const id = 'test-extension-id';
export const sendMessage = vi.fn();
export const connect = vi.fn(() => ({
  onMessage: { addListener: vi.fn() },
  onDisconnect: { addListener: vi.fn() },
}));
