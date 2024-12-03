import { GetValidatorInfoRequest, GetValidatorInfoResponse, ValidatorInfoResponse, ValidatorPenaltyRequest, ValidatorPenaltyResponse } from '@penumbra-zone/protobuf/penumbra/core/component/stake/v1/stake_pb';
import { StakeQuerierInterface } from '@penumbra-zone/types/querier';
export declare class StakeQuerier implements StakeQuerierInterface {
    private readonly client;
    constructor({ grpcEndpoint }: {
        grpcEndpoint: string;
    });
    validatorInfo(req: GetValidatorInfoRequest): Promise<GetValidatorInfoResponse>;
    allValidatorInfos(): AsyncIterable<ValidatorInfoResponse>;
    validatorPenalty(req: ValidatorPenaltyRequest): Promise<ValidatorPenaltyResponse>;
}
//# sourceMappingURL=staking.d.ts.map