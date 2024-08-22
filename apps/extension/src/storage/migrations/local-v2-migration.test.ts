// import { beforeEach, describe, expect, test } from 'vitest';
// import { MockStorageArea } from '../mock';
// import { ExtensionStorage } from '../base';
// import { localDefaults } from '../local';
// import { LocalStorageState, LocalStorageVersion } from '../types';
// import { localV1Migrations } from './local-v1-migrations';
// import { localV2Migrations } from './local-v2-migrations';
// import { ChainRegistryClient } from '@penumbra-labs/registry';
// import { sample } from 'lodash';
// import { AppParameters } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/app/v1/app_pb';
//
// describe('v2 local storage migrations', () => {
//   const storageArea = new MockStorageArea();
//   let v1ExtStorage: ExtensionStorage<LocalStorageState>;
//   let v2ExtStorage: ExtensionStorage<LocalStorageState>;
//   let v3ExtStorage: ExtensionStorage<LocalStorageState>;
//
//   beforeEach(() => {
//     v1ExtStorage = new ExtensionStorage<LocalStorageState>(
//       storageArea,
//       localDefaults,
//       LocalStorageVersion.V1,
//     );
//
//     v2ExtStorage = new ExtensionStorage<LocalStorageState>(
//       storageArea,
//       localDefaults,
//       LocalStorageVersion.V2,
//       {
//         [LocalStorageVersion.V1]: localV1Migrations,
//       },
//       {
//         [LocalStorageVersion.V1]: LocalStorageVersion.V2,
//       },
//     );
//
//     v3ExtStorage = new ExtensionStorage<LocalStorageState>(
//       storageArea,
//       localDefaults,
//       LocalStorageVersion.V3,
//       {
//         [LocalStorageVersion.V1]: localV1Migrations,
//         [LocalStorageVersion.V2]: localV2Migrations,
//       },
//       {
//         [LocalStorageVersion.V1]: LocalStorageVersion.V2,
//         [LocalStorageVersion.V2]: LocalStorageVersion.V3,
//       },
//     );
//   });
//
//   test('non-affected fields stay the same', async () => {
//     await v1ExtStorage.set('fullSyncHeight', 9483729);
//     const syncHeight = await v3ExtStorage.get('fullSyncHeight');
//     expect(syncHeight).toEqual(9483729);
//   });
//
//   describe('frontends', () => {
//     test('not set frontend gets ignored', async () => {
//       await v1ExtStorage.set('frontendUrl', '');
//       const url = await v3ExtStorage.get('frontendUrl');
//       expect(url).toEqual('');
//     });
//
//     test('have no change if user already selected frontend in registry', async () => {
//       const registryClient = new ChainRegistryClient();
//       const { frontends } = registryClient.bundled.globals();
//       const suggestedFrontend = sample(frontends.map(f => f.url));
//       await v1ExtStorage.set('frontendUrl', suggestedFrontend);
//       const url = await v3ExtStorage.get('frontendUrl');
//       expect(url).toEqual(suggestedFrontend);
//     });
//
//     test('user gets migrated to suggested frontend', async () => {
//       const registryClient = new ChainRegistryClient();
//       const { frontends } = registryClient.bundled.globals();
//       await v1ExtStorage.set('frontendUrl', 'http://badfrontend.void');
//       const url = await v3ExtStorage.get('frontendUrl');
//       expect(url).not.toEqual('http://badfrontend.void');
//       expect(frontends.map(f => f.url).includes(url!)).toBeTruthy();
//     });
//
//     test('works from v2 storage as well', async () => {
//       const registryClient = new ChainRegistryClient();
//       const { frontends } = registryClient.bundled.globals();
//       await v2ExtStorage.set('frontendUrl', 'http://badfrontend.void');
//       const url = await v3ExtStorage.get('frontendUrl');
//       expect(url).not.toEqual('http://badfrontend.void');
//       expect(frontends.map(f => f.url).includes(url!)).toBeTruthy();
//     });
//   });
//
//   describe('grpcEndpoint', () => {
//     test('not set gets ignored', async () => {
//       await v1ExtStorage.set('grpcEndpoint', undefined);
//       const url = await v3ExtStorage.get('grpcEndpoint');
//       expect(url).toEqual(undefined);
//     });
//
//     test('not connected to mainnet gets ignored', async () => {
//       const appParams = new AppParameters({ chainId: 'testnet-deimos-42' });
//       await v1ExtStorage.set('params', appParams.toJsonString());
//       await v1ExtStorage.set('grpcEndpoint', 'grpc.testnet.void');
//       const endpoint = await v3ExtStorage.get('grpcEndpoint');
//       expect(endpoint).toEqual('grpc.testnet.void');
//     });
//
//     test('user selected suggested endpoint', async () => {
//       const appParams = new AppParameters({ chainId: 'penumbra-1' });
//       await v1ExtStorage.set('params', appParams.toJsonString());
//       const registryClient = new ChainRegistryClient();
//       const { rpcs } = registryClient.bundled.globals();
//       const suggestedRpc = sample(rpcs.map(f => f.url));
//       await v1ExtStorage.set('grpcEndpoint', suggestedRpc);
//       const endpoint = await v3ExtStorage.get('grpcEndpoint');
//       expect(endpoint).toEqual(suggestedRpc);
//     });
//
//     test('user gets migrated to suggested frontend', async () => {
//       const appParams = new AppParameters({ chainId: 'penumbra-1' });
//       await v1ExtStorage.set('params', appParams.toJsonString());
//       await v1ExtStorage.set('grpcEndpoint', 'http://badfrontend.void');
//       const endpoint = await v3ExtStorage.get('grpcEndpoint');
//       expect(endpoint).not.toEqual('http://badfrontend.void');
//
//       const registryClient = new ChainRegistryClient();
//       const { rpcs } = registryClient.bundled.globals();
//       expect(rpcs.map(r => r.url).includes(endpoint!)).toBeTruthy();
//     });
//
//     test('works from v2 storage as well', async () => {
//       const appParams = new AppParameters({ chainId: 'penumbra-1' });
//       await v2ExtStorage.set('params', appParams.toJsonString());
//       await v2ExtStorage.set('grpcEndpoint', 'http://badfrontend.void');
//       const endpoint = await v3ExtStorage.get('grpcEndpoint');
//       expect(endpoint).not.toEqual('http://badfrontend.void');
//
//       const registryClient = new ChainRegistryClient();
//       const { rpcs } = registryClient.bundled.globals();
//       expect(rpcs.map(r => r.url).includes(endpoint!)).toBeTruthy();
//     });
//   });
// });
