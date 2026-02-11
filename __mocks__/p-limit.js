module.exports = jest.fn((concurrency) => {
  return async (fn) => fn();
});
