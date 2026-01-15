import addr31337 from "./addresses.31337.json";
import addr11155111 from "./addresses.11155111.json";

export function getAddresses(chainId) {
  if (chainId === 31337) return addr31337;
  if (chainId === 11155111) return addr11155111;
  return null;
}
