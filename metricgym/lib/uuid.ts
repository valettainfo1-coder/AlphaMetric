/**
 * UUIDv7 — client-generated, time-ordered primary keys.
 *
 * Time-ordered ids keep btree indexes append-friendly and make offline
 * rows sortable by creation time without a server round trip.
 */

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  // globalThis.crypto exists in browsers, workers and Node 19+.
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function uuidv7(timestampMs: number = Date.now()): string {
  return formatUuidV7(timestampMs, randomBytes(10));
}

/** Deterministic variant for seeding: caller supplies the 10 random bytes. */
export function uuidv7FromBytes(timestampMs: number, random: Uint8Array): string {
  return formatUuidV7(timestampMs, random);
}

function formatUuidV7(timestampMs: number, random: Uint8Array): string {
  if (random.length < 10) throw new Error("uuidv7 needs 10 random bytes");
  const bytes = new Uint8Array(16);
  // 48-bit big-endian unix timestamp in ms
  let ts = BigInt(Math.max(0, Math.floor(timestampMs)));
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number(ts & 0xffn);
    ts >>= 8n;
  }
  bytes.set(random.subarray(0, 10), 6);
  const b6 = bytes[6] ?? 0;
  const b8 = bytes[8] ?? 0;
  bytes[6] = (b6 & 0x0f) | 0x70; // version 7
  bytes[8] = (b8 & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
