export const usbDeviceFilter = (
  filter: USBDeviceFilter | undefined,
  device: USBDevice | undefined,
) =>
  filter != null &&
  device != null &&
  filter.vendorId === device.vendorId &&
  filter.productId === device.productId &&
  filter.classCode === device.deviceClass &&
  filter.subclassCode === device.deviceSubclass &&
  filter.protocolCode === device.deviceProtocol &&
  filter.serialNumber === device.serialNumber;
