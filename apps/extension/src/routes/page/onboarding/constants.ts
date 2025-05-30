// A request-level timeout that supersedes the channel transport-level timeout to prevent hanging requests.
export const DEFAULT_TRANSPORT_OPTS = { timeoutMs: 5000 };

// Define a canconcial default RPC.
export const DEFAULT_GRPC = 'https://penumbra-1.radiantcommons.com';

// Define a canconcial default frontend.
export const DEFAULT_FRONTEND = 'https://dex.penumbra.zone';
