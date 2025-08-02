export function assertValidUSBDeviceRequestOptions(
  reqOpts: unknown,
): asserts reqOpts is USBDeviceRequestOptions {
  if (reqOpts == null || typeof reqOpts !== 'object') {
    throw new TypeError('USBDeviceRequestOptions must be an object');
  }
  const {
    filters = undefined,
    exclusionFilters = undefined,
    ...extra
  } = reqOpts as Record<string, unknown>;

  if (Object.keys(extra).length) {
    throw new TypeError(
      `USBDeviceRequestOptions must not have ${Object.keys(extra).join()} fields`,
      { cause: reqOpts },
    );
  }

  if (!Array.isArray(filters)) {
    throw new TypeError('USBDeviceRequestOptions filters must be an array');
  }

  if (!filters.length) {
    throw new TypeError('USBDeviceRequestOptions should contain at least one filter');
  }

  if (exclusionFilters != null) {
    if (!Array.isArray(exclusionFilters)) {
      throw new TypeError('USBDeviceRequestOptions exclusionFilters must be an array if defined');
    }
    if (!exclusionFilters.length) {
      throw new TypeError(
        'USBDeviceRequestOptions exclusionFilters should contain at least one filter if defined',
      );
    }
  }

  for (const givenFilter of [
    ...(filters as unknown[]),
    ...((exclusionFilters ?? []) as unknown[]),
  ]) {
    assertValidUSBDeviceFilter(givenFilter);
  }
}

function assertValidUSBDeviceFilter(ft: unknown): asserts ft is USBDeviceFilter {
  if (ft == null || typeof ft !== 'object') {
    throw new TypeError('USBDeviceFilter must be an object');
  }
  const filterItems = Object.entries(ft);
  if (!filterItems.length) {
    throw new TypeError('USBDeviceFilter should have at least one constraint');
  }
  for (const [key, value] of filterItems) {
    switch (key) {
      case 'serialNumber':
        if (value != null && typeof value !== 'string') {
          throw new TypeError(`USBDeviceRequestOptions ${key} must be a string if defined`);
        }
        break;
      case 'vendorId':
      case 'productId':
      case 'classCode':
      case 'subclassCode':
      case 'protocolCode':
        if (value != null && typeof value !== 'number') {
          throw new TypeError(`USBDeviceRequestOptions ${key} must be a number if defined`);
        }
        break;
      default:
        throw new TypeError(`USBDeviceRequestOptions ${key} is not a valid filter key`);
    }
  }
}
