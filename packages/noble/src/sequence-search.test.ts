import { describe, expect, it } from 'vitest';
import { NobleClientInterface, NobleRegistrationResponse } from './client';
import { getNextSequence, MAX_SEQUENCE_NUMBER } from './sequence-search';
import { generateSpendKey, getFullViewingKey } from '@penumbra-zone/wasm/keys';

const seedPhrase =
  'benefit cherry cannon tooth exhibit law avocado spare tooth that amount pumpkin scene foil tape mobile shine apology add crouch situate sun business explain';
const spendKey = generateSpendKey(seedPhrase);
const fvk = getFullViewingKey(spendKey);

class MockNobleClient implements NobleClientInterface {
  private readonly responses = new Map<string, NobleRegistrationResponse>();

  async registerAccount(props: { sequence: number; accountIndex?: number }) {
    const key = this.hash(props);
    const response = this.responses.get(key) ?? NobleRegistrationResponse.NeedsDeposit;
    return Promise.resolve(response);
  }

  private hash({ sequence, accountIndex }: { sequence: number; accountIndex?: number }): string {
    return `${sequence}-${accountIndex ? accountIndex : 0}`;
  }

  setResponse({
    response,
    sequence,
    accountIndex,
  }: {
    response: NobleRegistrationResponse;
    sequence: number;
    accountIndex?: number;
  }) {
    const key = this.hash({ sequence, accountIndex });
    this.responses.set(key, response);
  }
}

describe('getNextSequence', () => {
  it('should find the first unused sequence number when all numbers are unused', async () => {
    const client = new MockNobleClient();
    const seq = await getNextSequence({ client, fvk });
    expect(seq).toEqual(0);
  });

  it('should find the next unused sequence number when some numbers are used', async () => {
    const client = new MockNobleClient();
    client.setResponse({ response: NobleRegistrationResponse.AlreadyRegistered, sequence: 0 });
    client.setResponse({ response: NobleRegistrationResponse.AlreadyRegistered, sequence: 1 });

    const seq = await getNextSequence({ client, fvk });
    expect(seq).toEqual(2);
  });

  it('should return the next sequence number when the midpoint has a deposit waiting for registration', async () => {
    const client = new MockNobleClient();
    client.setResponse({ response: NobleRegistrationResponse.AlreadyRegistered, sequence: 0 });
    client.setResponse({ response: NobleRegistrationResponse.AlreadyRegistered, sequence: 1 });
    client.setResponse({ response: NobleRegistrationResponse.Success, sequence: 2 });

    const seq = await getNextSequence({ client, fvk });
    expect(seq).toEqual(3);
  });

  it('should handle the case when all sequence numbers are registered', async () => {
    const client = new MockNobleClient();
    for (let i = 0; i <= MAX_SEQUENCE_NUMBER; i++) {
      client.setResponse({ response: NobleRegistrationResponse.AlreadyRegistered, sequence: i });
    }

    const seq = await getNextSequence({ client, fvk });
    expect(seq).toBeGreaterThanOrEqual(0);
    expect(seq).toBeLessThanOrEqual(MAX_SEQUENCE_NUMBER);
  });

  it('should handle a case deep in sequence', async () => {
    // Set up client so that sequences 0 to 5 are registered, and 6 onwards are unused
    const client = new MockNobleClient();
    for (let i = 0; i <= 50_000; i++) {
      client.setResponse({ response: NobleRegistrationResponse.AlreadyRegistered, sequence: i });
    }

    const seq = await getNextSequence({ client, fvk });
    expect(seq).toEqual(50_001);
  });

  it('should handle entire sequence flush', async () => {
    const client = new MockNobleClient();

    // Simulate that all sequence numbers are registered except the last one
    for (let i = 0; i < MAX_SEQUENCE_NUMBER; i++) {
      client.setResponse({ response: NobleRegistrationResponse.Success, sequence: i });
    }
    client.setResponse({
      response: NobleRegistrationResponse.Success,
      sequence: MAX_SEQUENCE_NUMBER,
    });

    const seq = await getNextSequence({ client, fvk });
    expect(seq).toBeGreaterThanOrEqual(0);
    expect(seq).toBeLessThanOrEqual(MAX_SEQUENCE_NUMBER);
  });

  it('should handle incorrectly sequenced registrations', async () => {
    const client = new MockNobleClient();
    client.setResponse({ response: NobleRegistrationResponse.AlreadyRegistered, sequence: 0 });
    client.setResponse({ response: NobleRegistrationResponse.Success, sequence: 1 });
    client.setResponse({ response: NobleRegistrationResponse.NeedsDeposit, sequence: 2 });
    client.setResponse({ response: NobleRegistrationResponse.AlreadyRegistered, sequence: 3 });
    client.setResponse({ response: NobleRegistrationResponse.Success, sequence: 4 });
    client.setResponse({ response: NobleRegistrationResponse.NeedsDeposit, sequence: 5 });

    const seq = await getNextSequence({ client, fvk });

    // The algorithm doesn't guarantee the earliest non-deposited, but should return at least one
    expect([2, 5].includes(seq)).toBeTruthy();
  });

  it('should find the highest sequence number when only it is unused', async () => {
    const client = new MockNobleClient();
    for (let i = 0; i < MAX_SEQUENCE_NUMBER; i++) {
      client.setResponse({ response: NobleRegistrationResponse.AlreadyRegistered, sequence: i });
    }

    const seq = await getNextSequence({ client, fvk });
    expect(seq).toEqual(MAX_SEQUENCE_NUMBER);
  });

  it('should handle sequence numbers for different account indices', async () => {
    const client = new MockNobleClient();
    client.setResponse({
      response: NobleRegistrationResponse.AlreadyRegistered,
      sequence: 0,
      accountIndex: 1,
    });
    client.setResponse({
      response: NobleRegistrationResponse.NeedsDeposit,
      sequence: 0,
      accountIndex: 2,
    });

    const seqAccount1 = await getNextSequence({ client, fvk, accountIndex: 1 });
    const seqAccount2 = await getNextSequence({ client, fvk, accountIndex: 2 });

    expect(seqAccount1).toEqual(1); // Next available sequence for accountIndex: 1
    expect(seqAccount2).toEqual(0); // Sequence 0 is available for accountIndex: 2
  });
});
