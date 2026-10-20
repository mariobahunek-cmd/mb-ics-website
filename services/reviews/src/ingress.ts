import { isIP } from "node:net";
// The approved proxy must strip and overwrite client-supplied X-Real-IP.
export function clientAddress(
  remote: string,
  forwarded: string | undefined,
  trustedProxy: string | undefined,
) {
  return trustedProxy && remote === trustedProxy && forwarded && isIP(forwarded)
    ? forwarded
    : remote;
}
