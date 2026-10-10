/** Small deterministic PRNG (Park–Miller) so decorations stay put between renders. */
export function createRng(seed: number) {
  let state = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  const next = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
  return {
    next,
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
  };
}
