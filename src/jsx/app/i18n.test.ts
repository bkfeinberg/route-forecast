jest.mock('i18next-browser-languagedetector', () => ({
  __esModule: true,
  default: {
    type: 'languageDetector',
    init: jest.fn(),
    detect: jest.fn(() => 'en'),
    cacheUserLanguage: jest.fn()
  }
}));

import i18n from './i18n';

describe('src/jsx/app/i18n.ts', () => {
  test('initializes i18next with supported languages, fallback, and resources', async () => {
    if (!i18n.isInitialized) {
      await new Promise<void>(resolve => i18n.on('initialized', () => resolve()));
    }

    expect(i18n.options.fallbackLng).toEqual(['en-US']);
    expect(i18n.options.supportedLngs).toEqual(
      expect.arrayContaining(['en-US', 'en', 'fr', 'es', 'bg', 'hu', 'it', 'zh'])
    );
    expect(i18n.t('buttons.bugReport')).toBe('Report a bug');
    expect(i18n.t('labels.language')).toBe('Select language');
  });
});
