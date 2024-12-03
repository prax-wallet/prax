import { QueryClientStatesRequest, QueryClientStatesResponse } from '@penumbra-zone/protobuf/ibc/core/client/v1/query_pb';
import type { IbcClientQuerierInterface } from '@penumbra-zone/types/querier';
export declare class IbcClientQuerier implements IbcClientQuerierInterface {
    private readonly client;
    constructor({ grpcEndpoint }: {
        grpcEndpoint: string;
    });
    ibcClientStates(req: QueryClientStatesRequest): Promise<QueryClientStatesResponse>;
}
//# sourceMappingURL=ibc-client.d.ts.map