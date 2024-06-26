import { describe, it, expect } from 'vitest';
import { isValidUrl } from './is-valid-url';

describe('isValidUrl', () => {
  it('should return true for valid http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('http://www.example.com')).toBe(true);
    expect(isValidUrl('http://example.com/path')).toBe(true);
    expect(isValidUrl('http://example.com?q=query')).toBe(true);
  });

  it('should return true for valid https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('https://www.example.com')).toBe(true);
    expect(isValidUrl('https://example.com/path')).toBe(true);
    expect(isValidUrl('https://example.com?q=query')).toBe(true);
  });

  it('should return false for URLs with unsupported protocols', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('mailto:someone@example.com')).toBe(false);
    expect(isValidUrl('chrome-extension://lkpmkhpnhknhmibgnmmhdhgdilepfghe/page.html')).toBe(false);
  });

  it('should return false for strings that are not URLs', () => {
    expect(isValidUrl('justastring')).toBe(false);
    expect(isValidUrl('www.example.com')).toBe(false);
    expect(isValidUrl('12345')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});
