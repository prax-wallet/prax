declare type ChromeExtensionMessageEventListener =
  chrome.runtime.ExtensionMessageEvent extends chrome.events.Event<infer L> ? L : never;
