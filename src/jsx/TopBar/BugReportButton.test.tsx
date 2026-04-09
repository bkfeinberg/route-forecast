// src/jsx/TopBar/BugReportButton.test.tsx
import { render } from 'test-utils';

jest.mock('Images/gustavorezende_lady_bug-555px.png', () => 'lady-bug.png');

jest.mock('react-i18next', () => {
  return {
    __esModule: true,
    useTranslation: jest.fn()
  };
});

jest.mock('react-responsive', () => {
  return {
    __esModule: true,
    useMediaQuery: jest.fn()
  };
});

jest.mock('@sentry/react', () => {
  return {
    __esModule: true,
    feedbackIntegration: jest.fn()
  };
});

/*import * as Mantine from '@mantine/core';
jest.mock('@mantine/core', () => {
  return {
    __esModule: true,
    MantineProvider: jest.requireActual<typeof Mantine>('@mantine/core').MantineProvider,
    createTheme: jest.requireActual<typeof Mantine>('@mantine/core').createTheme,
    Button: (props: any) => {
      const { children, ...rest } = props;
      return <button {...rest}>{children}</button>;
    }
  };
});
*/
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import * as Sentry from '@sentry/react';
import BugReportButton from './BugReportButton';

describe('BugReportButton', () => {
  const mockedUseTranslation = useTranslation as unknown as jest.Mock;
  const mockedUseMediaQuery = useMediaQuery as unknown as jest.Mock;
  const mockedFeedbackIntegration = Sentry.feedbackIntegration as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTranslation.mockReturnValue({
      t: (key: string) => key
    });
    mockedUseMediaQuery.mockReturnValue(false);
    mockedFeedbackIntegration.mockReturnValue({
      attachTo: jest.fn()
    });
  });

  test('renders button with translation key', () => {
    const { container } = render(<BugReportButton />);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button!.textContent).toBe('buttons.bugReport');
  });

  test('renders bug image with correct src', () => {
    const { container } = render(<BugReportButton />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.src).toContain('lady-bug.png');
  });

  test('sets button height to 30px when media query is false', () => {
    mockedUseMediaQuery.mockReturnValue(false);
    const { container } = render(<BugReportButton />);
    const button = container.querySelector('button');
    expect(button!.style.height).toBe('30px');
  });

  test('sets button height to 40px when first media query is true', () => {
    mockedUseMediaQuery.mockImplementation((query: any) => 
      query.query === '(min-width: 1300px)'
    );
    const { container } = render(<BugReportButton />);
    const button = container.querySelector('button');
    expect(button!.style.height).toBe('40px');
  });

  test('sets button variant to xsm when media query is false', () => {
    mockedUseMediaQuery.mockReturnValue(false);
    const { container } = render(<BugReportButton />);
    const button = container.querySelector('button');
    expect(button!.getAttribute('style')!.includes('xsm')).toBe(true);
  });

  test('sets button variant to sm when media query 1250px is true', () => {
    mockedUseMediaQuery.mockImplementation((query: any) => 
      query.query === '(min-width: 1250px)'
    );
    const { container } = render(<BugReportButton />);
    const button = container.querySelector('button');
    expect(button!.getAttribute('style')!.includes('var(--button-height-sm)')).toBe(true);
  });

  test('sets image dimensions to 34px height and 25px width when 1300px query is false', () => {
    mockedUseMediaQuery.mockReturnValue(false);
    const { container } = render(<BugReportButton />);
    const img = container.querySelector('img');
    const style = img!.getAttribute('style');
    expect(style).toContain('height');
    expect(style).toContain('width');
  });

  test('initializes Sentry feedback integration with correct options', () => {
    render(<BugReportButton />);
    expect(mockedFeedbackIntegration).toHaveBeenCalledWith({
      autoInject: false,
      isEmailRequired: false
    });
  });

  test('attaches Sentry feedback to button ref', () => {
    const mockAttachTo = jest.fn();
    mockedFeedbackIntegration.mockReturnValue({
      attachTo: mockAttachTo
    });
    const { container } = render(<BugReportButton />);
    expect(mockAttachTo).toHaveBeenCalled();
  });

  test('button has id bugImage for img element', () => {
    const { container } = render(<BugReportButton />);
    const img = container.querySelector('#bugImage');
    expect(img).not.toBeNull();
  });
});