import { writeObjToFile } from './writeToFile';

const createObjectURLMock = jest.fn();
const revokeObjectURLMock = jest.fn();
const clickMock = jest.fn();

jest.mock('export-to-csv', () => ({
  mkConfig: jest.fn(() => ({ columns: ['provider'] })),
  generateCsv: jest.fn(() => () => 'provider,time,distance\n'),
  asBlob: jest.fn(() => (csv: string) => new Blob([csv], { type: 'text/csv' })),
}));

describe('writeObjToFile', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalClick = HTMLAnchorElement.prototype.click;

  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    clickMock.mockImplementation(() => {});
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
      configurable: true,
      writable: true,
      value: clickMock,
    });
  });

  afterAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
      configurable: true,
      writable: true,
      value: originalClick,
    });
  });

  test('creates JSON blob, sets anchor attrs, clicks, and revokes URL', async () => {
    createObjectURLMock.mockReturnValue('blob:json-url');

    const data = { weatherKit: [{ provider: 'weatherKit', time: 1, distance: 2 }] };
    writeObjToFile(data as any, false);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const createdBlob = createObjectURLMock.mock.calls[0][0];
    expect(createdBlob).toBeInstanceOf(Blob);
    expect(await createdBlob.text()).toBe(JSON.stringify(data));
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:json-url');
  });

  test('creates CSV blob, sets anchor attrs, clicks, and revokes URL', async () => {
    createObjectURLMock.mockReturnValue('blob:csv-url');

    const data = { weatherKit: [{ provider: 'weatherKit', time: 1, distance: 2 }] };
    writeObjToFile(data as any, true);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const createdBlob = createObjectURLMock.mock.calls[0][0];
    expect(createdBlob).toBeInstanceOf(Blob);
    expect(await createdBlob.text()).toBe('provider,time,distance\n');
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:csv-url');
  });
});
