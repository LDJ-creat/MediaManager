declare module 'node:child_process' {
  export const spawnSync: any;
}

declare module 'node:fs' {
  const fs: any;
  export default fs;
}

declare module 'node:os' {
  const os: any;
  export default os;
}

declare module 'node:path' {
  const path: any;
  export default path;
}

declare module 'node:process' {
  const process: any;
  export default process;
}

declare module 'node:url' {
  export const fileURLToPath: any;
}

declare module 'node:buffer' {
  export const Buffer: any;
}
