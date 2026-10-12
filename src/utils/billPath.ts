export function getBillBasePath(packageid: string): string {
  if (!packageid) {
    return '';
  }
  if (packageid.startsWith("META")) {
    return `/governance`;
  }
  return `/bill/${packageid.split('-')[1]}`;
}
