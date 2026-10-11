export function getBillBasePath(packageid: string): string {
  if (!packageid) {
    return '';
  }
  if (packageid.startsWith("META")) {
    return `/governance/${packageid.split('-')[1]}`;
  }
  return `/bill/${packageid.split('-')[1]}`;
}
