import { describe, it, expect, vi } from 'vitest';
import { adjustWalletBirthday } from './set-grpc-endpoint';
import { localExtStorage } from '../../../storage/local';

describe('correctBirthdayHeightIfNeeded', () => {
  it('should update the wallet birthday if the users wallet birthday is greater than the chain height', async () => {
    const mockSet = vi.fn();
    vi.spyOn(localExtStorage, 'set').mockImplementation(mockSet);
    await adjustWalletBirthday(1000, 900n);

    expect(mockSet).toHaveBeenCalledWith('walletCreationBlockHeight', 900);
  });

  it('should not update the wallet birthday if the users wallet birthday is less than the chain height', async () => {
    const mockSet = vi.fn();
    vi.spyOn(localExtStorage, 'set').mockImplementation(mockSet);
    await adjustWalletBirthday(900, 1000n);

    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should not update the wallet birthday if the users wallet birthday is equal to the chain height', async () => {
    const mockSet = vi.fn();
    vi.spyOn(localExtStorage, 'set').mockImplementation(mockSet);
    await adjustWalletBirthday(900, 900n);

    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should not update the wallet birthday if the latestBlockHeight is undefined', async () => {
    const mockSet = vi.fn();
    vi.spyOn(localExtStorage, 'set').mockImplementation(mockSet);
    await adjustWalletBirthday(900, undefined);

    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should not update if the wallet birthday is zero or negative', async () => {
    const mockSet = vi.spyOn(localExtStorage, 'set').mockImplementation(() => Promise.resolve());

    await adjustWalletBirthday(0, 900n);
    await adjustWalletBirthday(-100, 900n);

    expect(mockSet).not.toHaveBeenCalled();
  });
});
