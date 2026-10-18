export const BILL_PAGE_SIZE = 10;

export const BILL_ORDER_FIELDS = ['dateIssued', 'lastModified', 'lastAction', 'lastUpdate'] as const;
export type BillOrderField = (typeof BILL_ORDER_FIELDS)[number];
export type BillOrderDir = 'asc' | 'desc';

/** What the filter UI actually sets. Not a Hasura bool exp. */
export type BillSearch = {
  congress: number[];
  originChamber?: string;
  billTypes: string[];
  number?: number;
  title?: string;
  includeOfficialTitle: boolean;
  versions: string[];
  sponsorName?: string;
  appropriationsOnly: boolean;
  policyArea?: string;
  legislativeSubjects?: string[];
};

export const emptyBillSearch = (): BillSearch => ({
  congress: [],
  billTypes: [],
  versions: [],
  includeOfficialTitle: true,
  appropriationsOnly: false,
});

export type BillListItem = {
  packageid: string;
  slug: string | null;
  congress: number;
  billType: string;
  number: number;
  version: string | null;
  lastModified: string;
  shortTitle: string | null;
  officialTitle: string;
  sponsor: { fullName?: string | null; [key: string]: unknown } | null;
  dateIssued: string;
  provisionCount: number;
};