// Anchor durable epoch timestamps once, then measure elapsed time monotonically.
// NTP/WSL wall-clock corrections must not turn a 35-second gateway into a fast one.
const epoch = Date.now();
const started = performance.now();
export const paymentNow = () => Math.floor(epoch + performance.now() - started);
