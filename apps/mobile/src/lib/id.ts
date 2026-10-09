let counter = 0;

/** Sortable, collision-resistant local id (no native crypto needed). */
export function createId(prefix = ''): string {
  counter = (counter + 1) % 1_679_616;
  const time = Date.now().toString(36);
  const seq = counter.toString(36).padStart(4, '0');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${time}${seq}${rand}`;
}
