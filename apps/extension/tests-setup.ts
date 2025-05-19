import { vi } from 'vitest';
import { storage, runtime } from '@repo/mock-chrome';

vi.stubGlobal('chrome', { runtime, storage });
vi.stubGlobal('DEFAULT_GRPC_URL', 'https://rpc.example.com/');
vi.stubGlobal('PRAX', 'thisisnotarealextensionid');
