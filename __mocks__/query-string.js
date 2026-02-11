module.exports = {
  stringify: jest.fn((obj) => {
    const params = new URLSearchParams();
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }),
  parse: jest.fn((str) => {
    const params = new URLSearchParams(str);
    const obj = {};
    params.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }),
};
