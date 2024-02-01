import { describe, expect, test } from 'vitest';
import { ValueViewComponent } from './value';
import { render } from '@testing-library/react';
import {
  DenomMetadata,
  ValueView,
} from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/asset/v1alpha1/asset_pb';
import { base64ToUint8Array, bech32AssetId } from '@penumbra-zone/types';

describe('<ValueViewComponent />', () => {
  const penumbraDenomMetadata = new DenomMetadata({
    base: 'upenumbra',
    display: 'penumbra',
    penumbraAssetId: {
      inner: base64ToUint8Array('KeqcLzNx9qSH5+lcJHBB9KNW+YPrBk5dKzvPMiypahA='),
    },
    images: [
      {
        png: 'https://raw.githubusercontent.com/penumbra-zone/web/main/apps/webapp/public/favicon.png',
      },
    ],
    denomUnits: [
      {
        denom: 'penumbra',
        exponent: 6,
      },
      {
        denom: 'mpenumbra',
        exponent: 3,
      },
      {
        denom: 'upenumbra',
        exponent: 0,
      },
    ],
  });

  describe('when rendering a known denomination', () => {
    const valueView = new ValueView({
      valueView: {
        case: 'knownDenom',
        value: {
          amount: {
            hi: 0n,
            lo: 123_456_789n,
          },
          denom: penumbraDenomMetadata,
        },
      },
    });

    test('renders the amount in the display denom unit', () => {
      const { container } = render(<ValueViewComponent view={valueView} />);

      expect(container).toHaveTextContent('123.456789 penumbra');
    });
  });

  describe('when rendering an unknown denomination', () => {
    const valueView = new ValueView({
      valueView: {
        case: 'unknownDenom',
        value: {
          amount: {
            hi: 0n,
            lo: 123_456_789n,
          },
          assetId: {
            inner: penumbraDenomMetadata.penumbraAssetId!.inner,
          },
        },
      },
    });

    test('renders the amount in the base unit, along with an asset ID', () => {
      const { container } = render(<ValueViewComponent view={valueView} />);
      const assetIdAsString = bech32AssetId(penumbraDenomMetadata.penumbraAssetId!);

      expect(container).toHaveTextContent(`123,456,789${assetIdAsString}`);
    });
  });
});