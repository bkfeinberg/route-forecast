import { 
  browserIsChrome, 
  browserIsFirefox, 
  browserIsSafari, 
  extensionIsInstalled 
} from './extensionDetect';

// Mock Sentry logger
jest.mock('@sentry/react', () => ({
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    fmt: jest.fn(),
  }
}));

describe('extensionDetect', () => {
  let originalWindow: any;
  let originalChrome: any;
  let originalBrowser: any;

  beforeEach(() => {
    // Save original values
    originalWindow = window;
    originalChrome = (global as any).chrome;
    originalBrowser = (global as any).browser;
  });

  afterEach(() => {
    // Restore original values
    (global as any).chrome = originalChrome;
    (global as any).browser = originalBrowser;
  });

  describe('browserIsChrome', () => {
    it('should return true for Chrome browser', () => {
      Object.defineProperty(window, 'chrome', {
        value: {},
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Google Inc.',
        writable: true,
        configurable: true
      });

      expect(browserIsChrome()).toBe(true);
    });

    it('should return false when chrome is undefined', () => {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Google Inc.',
        writable: true,
        configurable: true
      });

      expect(browserIsChrome()).toBe(false);
    });

    it('should return false for non-Chrome browser', () => {
      Object.defineProperty(window, 'chrome', {
        value: {},
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Mozilla Corporation',
        writable: true,
        configurable: true
      });

      expect(browserIsChrome()).toBe(false);
    });

    it('should return false when chrome is null', () => {
      Object.defineProperty(window, 'chrome', {
        value: null,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Google Inc.',
        writable: true,
        configurable: true
      });

      expect(browserIsChrome()).toBe(false);
    });
  });

  describe('browserIsFirefox', () => {
    it('should return true for Firefox browser', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
        writable: true,
        configurable: true
      });

      expect(browserIsFirefox()).toBeTruthy();
    });

    it('should return true for Firefox iOS', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/36.0 Mobile/15E148 Safari/605.1.15',
        writable: true,
        configurable: true
      });

      expect(browserIsFirefox()).toBeTruthy();
    });

    it('should return false for non-Firefox browser', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true,
        configurable: true
      });

      expect(browserIsFirefox()).toBeFalsy();
    });
  });

  describe('browserIsSafari', () => {
    it('should return true for Safari browser', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        writable: true,
        configurable: true
      });

      expect(browserIsSafari()).toBeTruthy();
    });

    it('should return false for Chrome (contains Safari in user agent)', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true,
        configurable: true
      });

      expect(browserIsSafari()).toBeFalsy();
    });

    it('should return false for Chrome on iOS (CriOS)', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Mobile/15E148 Safari/604.1',
        writable: true,
        configurable: true
      });

      expect(browserIsSafari()).toBeFalsy();
    });

    it('should return false for Firefox', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
        writable: true,
        configurable: true
      });

      expect(browserIsSafari()).toBeFalsy();
    });
  });

  describe('extensionIsInstalled', () => {
    it('should return false for Chrome when chrome is undefined', async () => {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Google Inc.',
        writable: true,
        configurable: true
      });

      const result = await extensionIsInstalled();
      expect(result).toBe(false);
    });

    it('should return true for Chrome when extension is installed with valid version', async () => {
      Object.defineProperty(window, 'chrome', {
        value: {
          runtime: {
            sendMessage: jest.fn((id, msg, callback) => {
              callback({ version: 1.5 });
            })
          }
        },
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Google Inc.',
        writable: true,
        configurable: true
      });

      const result = await extensionIsInstalled();
      expect(result).toBe(true);
    });

    it('should return false for Chrome when extension returns lower version', async () => {
      let lastError: any = null;
      Object.defineProperty(window, 'chrome', {
        value: {
          runtime: {
            sendMessage: jest.fn((id, msg, callback) => {
              callback({ version: 0.5 });
            }),
            get lastError() {
              return lastError;
            }
          }
        },
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Google Inc.',
        writable: true,
        configurable: true
      });

      const result = await extensionIsInstalled();
      expect(result).toBe(false);
    });

    it('should return false for Chrome when chrome.runtime.lastError is set', async () => {
      Object.defineProperty(window, 'chrome', {
        value: {
          runtime: {
            sendMessage: jest.fn((id, msg, callback) => {
              (window.chrome as any).runtime.lastError = { message: 'Extension not found' };
              callback();
            }),
            lastError: { message: 'Extension not found' }
          }
        },
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Google Inc.',
        writable: true,
        configurable: true
      });

      const result = await extensionIsInstalled();
      expect(result).toBe(false);
    });

    it('should return false for Chrome when callback receives no reply', async () => {
      Object.defineProperty(window, 'chrome', {
        value: {
          runtime: {
            sendMessage: jest.fn((id, msg, callback) => {
              callback(undefined);
            }),
            lastError: null
          }
        },
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Google Inc.',
        writable: true,
        configurable: true
      });

      const result = await extensionIsInstalled();
      expect(result).toBe(false);
    });

    it('should return true for Firefox when getRpExtVersion is defined with valid version', async () => {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Mozilla Corporation',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window, 'getRpExtVersion', {
        value: jest.fn(() => 1.5),
        writable: true,
        configurable: true
      });

      const result = await extensionIsInstalled();
      expect(result).toBe(true);
    });

    it('should return false for Firefox when getRpExtVersion is not defined', async () => {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Mozilla Corporation',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window, 'getRpExtVersion', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const result = await extensionIsInstalled();
      expect(result).toBe(false);
    });

    it('should return false for Firefox when getRpExtVersion returns lower version', async () => {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Mozilla Corporation',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window, 'getRpExtVersion', {
        value: jest.fn(() => 0.5),
        writable: true,
        configurable: true
      });

      const result = await extensionIsInstalled();
      expect(result).toBe(false);
    });

    it('should return true for Safari when browser.runtime.sendMessage returns valid version', async () => {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Apple Computer, Inc.',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        writable: true,
        configurable: true
      });

      (global as any).browser = {
        runtime: {
          sendMessage: jest.fn(() => Promise.resolve({ version: 1.5 }))
        }
      };

      const result = await extensionIsInstalled();
      expect(result).toBe(true);
    });

    it('should return false for Safari when browser.runtime.sendMessage returns lower version', async () => {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Apple Computer, Inc.',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        writable: true,
        configurable: true
      });

      (global as any).browser = {
        runtime: {
          sendMessage: jest.fn(() => Promise.resolve({ version: 0.5 }))
        }
      };

      const result = await extensionIsInstalled();
      expect(result).toBe(false);
    });

    it('should return false for Safari when browser.runtime.sendMessage throws error', async () => {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Apple Computer, Inc.',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        writable: true,
        configurable: true
      });

      (global as any).browser = {
        runtime: {
          sendMessage: jest.fn(() => Promise.reject(new Error('Extension not found')))
        }
      };

      const result = await extensionIsInstalled();
      expect(result).toBe(false);
    });

    it('should return false for unknown browser', async () => {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'vendor', {
        value: 'Unknown',
        writable: true,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Unknown OS) UnknownBrowser/1.0',
        writable: true,
        configurable: true
      });

      const result = await extensionIsInstalled();
      expect(result).toBe(false);
    });
  });
});
