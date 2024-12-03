import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { Transaction } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import type { AppQuerierInterface } from '@penumbra-zone/types/querier';
export declare class AppQuerier implements AppQuerierInterface {
    private readonly client;
    constructor({ grpcEndpoint }: {
        grpcEndpoint: string;
    });
    appParams(): Promise<AppParameters>;
    txsByHeight(blockHeight: bigint): Promise<Transaction[]>;
}
//# sourceMappingURL=app.d.ts.map