type OriginString = string;

export type RevokeRequest = OriginString;

export const isRevokeRequest = (str: unknown): str is RevokeRequest => isOriginString(str);

export const isOriginString = (str: unknown): str is OriginString => {
  if (typeof str === 'string') {
    try {
      const parse = new URL(str);
      return parse.origin === str;
    } catch (e) {
      console.warn('Invalid origin url string', str, e);
    }
  }
  return false;
};
