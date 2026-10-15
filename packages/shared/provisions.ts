export type ProvisionRecord = {
  packageid: string;
  location: number;
  parentLocation: number | null;
  level: number | null;
  provisionTag: string | null;
  provisionType: string | null;
  enum: string | null;
  header: string | null;
  text: string | null;
  displayTag: string | null;
};