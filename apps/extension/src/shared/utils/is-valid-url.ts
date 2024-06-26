export const isValidUrl = (url: string) => {
  try {
    const proposedUrl = new URL(url);

    // Security measure: allows us to guard against someone being deceived
    // into adding a url with chrome-extension:// in it with intentions to inject code
    if (!['https:', 'http:'].includes(proposedUrl.protocol)) {
      throw new Error(`protocol "${proposedUrl.protocol}" is not supported`);
    }

    return true;
  } catch {
    return false;
  }
};
