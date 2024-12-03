import { createClient } from './utils.js';
import { StakeService } from '@penumbra-zone/protobuf';
export class StakeQuerier {
    client;
    constructor({ grpcEndpoint }) {
        this.client = createClient(grpcEndpoint, StakeService);
    }
    validatorInfo(req) {
        return this.client.getValidatorInfo(req);
    }
    allValidatorInfos() {
        /**
         * Include inactive validators when saving to our local database, since we
         * serve the `ValidatorInfo` RPC method from the extension, and may receive
         * requests for inactive validators.
         */
        return this.client.validatorInfo({ showInactive: true });
    }
    validatorPenalty(req) {
        return this.client.validatorPenalty(req);
    }
}
