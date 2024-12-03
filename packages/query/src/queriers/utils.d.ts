import { PromiseClient } from '@connectrpc/connect';
import { ServiceType } from '@bufbuild/protobuf';
export declare const createClient: <T extends ServiceType>(grpcEndpoint: string, serviceType: T) => PromiseClient<T>;
//# sourceMappingURL=utils.d.ts.map