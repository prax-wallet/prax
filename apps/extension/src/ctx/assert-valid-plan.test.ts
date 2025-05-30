/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- test file */
import { ActionPlan } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { generateSpendKey, getAddressByIndex, getFullViewingKey } from '@penumbra-zone/wasm/keys';
import { describe, expect, it } from 'vitest';
import { assertValidActionPlans } from './assert-valid-plan.js';

const currentUserSeedPhrase =
  'benefit cherry cannon tooth exhibit law avocado spare tooth that amount pumpkin scene foil tape mobile shine apology add crouch situate sun business explain';
const currentUserFullViewingKey = getFullViewingKey(generateSpendKey(currentUserSeedPhrase));
const currentUserAddress = getAddressByIndex(currentUserFullViewingKey, 1);

const otherUserSeedPhrase =
  'cancel tilt shallow way roast utility profit satoshi mushroom seek shift helmet';
const otherUserAddress = getAddressByIndex(
  getFullViewingKey(generateSpendKey(otherUserSeedPhrase)),
  1,
);

describe('individual plans', () => {
  it('rejects an empty action plan', () => {
    const emptyActionPlan = new ActionPlan({});
    expect(() => assertValidActionPlans([emptyActionPlan], currentUserFullViewingKey)).toThrow(
      'Missing action plan',
    );
  });

  it('rejects an action missing a value', () => {
    const planMissingValue = new ActionPlan({});
    planMissingValue.action.case = 'spend';
    expect(() => assertValidActionPlans([planMissingValue], currentUserFullViewingKey)).toThrow(
      'Missing action plan',
    );
  });

  it('rejects an action missing a case', () => {
    const planMissingCase = new ActionPlan({});
    planMissingCase.action.value = {} as any;
    planMissingCase.action.case = undefined;

    expect(() => assertValidActionPlans([planMissingCase], currentUserFullViewingKey)).toThrow(
      'Unknown action plan',
    );
  });

  it('rejects an action with some unknown case', () => {
    const planUnknownCase = new ActionPlan({});
    planUnknownCase.action.value = {} as any;
    planUnknownCase.action.case = 'notValid' as ActionPlan['action']['case'];
    expect(() => assertValidActionPlans([planUnknownCase], currentUserFullViewingKey)).toThrow(
      'Unknown action plan',
    );
  });

  describe('swap actions', () => {
    it('does not reject when the swap claim address is controlled', () => {
      const swapWithCurrentUserAddress = new ActionPlan({
        action: {
          case: 'swap',
          value: {
            swapPlaintext: { claimAddress: currentUserAddress },
          },
        },
      });

      expect(() =>
        assertValidActionPlans([swapWithCurrentUserAddress], currentUserFullViewingKey),
      ).not.toThrow();
    });

    it('rejects when the swap claim address is not controlled', () => {
      const swapWithOtherUserAddress = new ActionPlan({
        action: {
          case: 'swap',
          value: {
            swapPlaintext: { claimAddress: otherUserAddress },
          },
        },
      });
      expect(() =>
        assertValidActionPlans([swapWithOtherUserAddress], currentUserFullViewingKey),
      ).toThrow('uncontrolled claim address');
    });

    it('rejects when the swap claim address is undefined', () => {
      const swapWithUndefinedAddress = new ActionPlan({
        action: {
          case: 'swap',
          value: {
            swapPlaintext: {},
          },
        },
      });
      expect(() =>
        assertValidActionPlans([swapWithUndefinedAddress], currentUserFullViewingKey),
      ).toThrow('missing claim address');
    });

    it('rejects when the swap claim address is all zeroes', () => {
      const swapWithWrongLengthClaimAddress = new ActionPlan({
        action: {
          case: 'swap',
          value: {
            swapPlaintext: {
              claimAddress: { inner: new Uint8Array(80).fill(0) },
            },
          },
        },
      });

      expect(() =>
        assertValidActionPlans([swapWithWrongLengthClaimAddress], currentUserFullViewingKey),
      ).toThrow('missing claim address');
    });
  });

  describe('swapClaim actions', () => {
    it('rejects swapClaim actions which do not require authorization', () => {
      const swapClaimAction = new ActionPlan({
        action: {
          case: 'swapClaim',
          value: {},
        },
      });

      expect(() => assertValidActionPlans([swapClaimAction], currentUserFullViewingKey)).toThrow(
        'does not require authorization',
      );
    });
  });

  describe('output actions', () => {
    it.each([undefined, 0, 1, 80, 81])(
      `rejects when the output destination address is %s zeroes`,
      innerLength => {
        const destAddress =
          innerLength == null ? undefined : { inner: new Uint8Array(innerLength) };
        expect(() =>
          assertValidActionPlans(
            [
              new ActionPlan({
                action: {
                  case: 'output',
                  value: { destAddress },
                },
              }),
            ],
            currentUserFullViewingKey,
          ),
        ).toThrow('missing destination address');
      },
    );

    it.each([
      { inner: currentUserAddress.inner.slice(1) },
      { inner: Uint8Array.from([...currentUserAddress.inner, 81]) },
    ])('rejects when the output destination address is invalid', destAddress => {
      expect(() =>
        assertValidActionPlans(
          [
            new ActionPlan({
              action: {
                case: 'output',
                value: { destAddress },
              },
            }),
          ],
          currentUserFullViewingKey,
        ),
      ).toThrow('invalid destination address');
    });

    it('does not reject when the output destination address is nonzero', () => {
      const outputWithValidDestination = new ActionPlan({
        action: {
          case: 'output',
          value: {
            destAddress: { inner: new Uint8Array(80).fill(3) },
          },
        },
      });

      expect(() =>
        assertValidActionPlans([outputWithValidDestination], currentUserFullViewingKey),
      ).not.toThrow();
    });
  });
});

describe('lists of plans', () => {
  it('rejects when no actions are provided', () => {
    expect(() => assertValidActionPlans([], currentUserFullViewingKey)).toThrow(
      'No actions planned',
    );
    expect(() => assertValidActionPlans(undefined, currentUserFullViewingKey)).toThrow(
      'No actions planned',
    );
  });

  it('validates all actions', () => {
    expect(() =>
      assertValidActionPlans(
        [
          new ActionPlan({
            action: {
              case: 'spend',
              value: {},
            },
          }),
          new ActionPlan({
            action: {
              case: 'delegate',
              value: {},
            },
          }),
        ],
        currentUserFullViewingKey,
      ),
    ).not.toThrow();

    expect(() =>
      assertValidActionPlans(
        [
          new ActionPlan({
            action: {
              case: 'spend',
              value: {},
            },
          }),
          new ActionPlan({
            action: {
              case: 'output',
              value: { destAddress: otherUserAddress },
            },
          }),
          new ActionPlan({
            action: {
              case: 'swap',
              value: {
                swapPlaintext: { claimAddress: otherUserAddress },
              },
            },
          }),
        ],
        currentUserFullViewingKey,
      ),
    ).toThrow('uncontrolled claim address');
  });
});
