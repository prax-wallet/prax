import { createPromiseClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
export const createClient = (grpcEndpoint, serviceType) => {
    const transport = createGrpcWebTransport({
        baseUrl: grpcEndpoint,
    });
    return createPromiseClient(serviceType, transport);
};
