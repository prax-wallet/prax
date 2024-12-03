import { SctQuerierInterface } from '@penumbra-zone/types/querier';
import { TimestampByHeightRequest, TimestampByHeightResponse } from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';
export declare class SctQuerier implements SctQuerierInterface {
    private readonly client;
    constructor({ grpcEndpoint }: {
        grpcEndpoint: string;
    });
    timestampByHeight(req: TimestampByHeightRequest): Promise<TimestampByHeightResponse>;
}
//# sourceMappingURL=sct.d.ts.map