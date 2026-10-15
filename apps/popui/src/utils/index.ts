import { type ProvisionRecord } from '@populegis/shared';
import allProvisionTypes from './provisionTypes.json';

const aboveSectionLabels: Record<string, string> = {
  'division': 'Div.',
  'title': 'Title',
  'subtitle': 'Subtitle',
  'part': 'Part',
  'subpart': 'Subpart',
  'chapter': 'Ch.',
  'subchapter': 'Subch.',
};

export function pTagAncestorBreadcrumbs(provisionTag: string): string[] {
  const types = Object.keys(aboveSectionLabels);
  const matches = types
    .map(d => [...provisionTag.matchAll(new RegExp(`-${d}-`, "g"))])
    .flat()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  return matches.map(match => {
    const type = match[0].slice(1, -1);
    const enumVal = provisionTag.slice(match.index!).replace(match[0], "").split('-')[0]?.replace('.', '');
    return `${aboveSectionLabels[type]} ${enumVal}`;
  });
}

export function pTagBreadcrumbs(provisionTag: string) {
  const excludedProvisionTypes = ['PACKAGE', 'legis-body'];
  const provisionTypes = allProvisionTypes.filter(d => !excludedProvisionTypes.includes(d));
  const tagProvisionTypeMatches = provisionTypes
    .map(d => [...provisionTag.matchAll(new RegExp(`-${d}-`, "g"))])
    .flat()
    .sort((a, b) => a.index - b.index);
  let tagEnums = tagProvisionTypeMatches.map(d => provisionTag.slice(d.index).replace(d[0], "").split('-')[0]?.replace('.', ''))
  let tagTypes = tagProvisionTypeMatches.map(d => d[0].slice(1, -1)).map(d => d == 'section' ? '§' : d);

  const lastSectionIndex = tagTypes.lastIndexOf('§');
  tagEnums = tagEnums.slice(lastSectionIndex);
  tagTypes = tagTypes.slice(lastSectionIndex);

  // Replace quoted-block location numbers with indicator
  for (let i = 0; i < tagTypes.length; i++) {
    if (tagTypes[i] === 'quoted-block') {
      tagEnums[i] = ' “ ';
    }
  }

  const subProvisionEnums = tagEnums.slice(1);
  return tagTypes.slice(0, 1).map((d, i) => `${d} ${tagEnums[i]}`).join('  ') + subProvisionEnums.join('');
}

const subSectionTypes = ['subsection', 'paragraph', 'subparagraph', 'clause', 'subclause', 'item', 'subitem'];

export function provisionDisplayTag(provisionTag: string, provisionType: string, header: string | null | undefined, enumText: string | null | undefined) {
  if (!provisionTag || !provisionType) return '';

  const resolvedHeader = provisionTag.includes('quoted-block') ? `“${header}”` : header;

  if (provisionType === 'section') {
    const sec = enumText ? `\u00A7\u2009${enumText}` : '';
    return sec + (resolvedHeader ? (sec ? ' ' : '') + resolvedHeader : '');
  }

  if (subSectionTypes.includes(provisionType)) {
    const crumb = pTagBreadcrumbs(provisionTag);
    return crumb + (resolvedHeader ? ' ' + resolvedHeader : '');
  }

  // For title, division, part, subtitle, etc. — show ancestor breadcrumbs
  const crumbs = pTagAncestorBreadcrumbs(provisionTag);
  if (crumbs.length > 0) {
    const last = crumbs[crumbs.length - 1];
    const withHeader = resolvedHeader ? `${last} \u2014 ${resolvedHeader}` : last;
    return [...crumbs.slice(0, -1), withHeader].join(' > ');
  }

  // Fallback for types not in the breadcrumb map (e.g. dedication)
  const typeLabel = provisionType.charAt(0).toUpperCase() + provisionType.slice(1);
  const prefix = enumText ? `${typeLabel} ${enumText}` : typeLabel;
  return prefix + (resolvedHeader ? ' \u2014 ' + resolvedHeader : '');
};

export interface DisplayProvision extends ProvisionRecord {
  indentLevel: number;
  children: DisplayProvision[];
}

export type Unpacked<T> = T extends (infer U)[] ? U : T;

export const noHeaderTocDisplay = (provision: DisplayProvision) => provision.provisionType && ['division', 'title', 'subtitle', 'part', 'section', 'dedication'].includes(provision.provisionType);
export const centeredHeader = (provision: DisplayProvision) => provision.provisionType && ['division', 'title', 'subtitle', 'part', 'chapter', 'subchapter'].includes(provision.provisionType);

export const onlyChildrenTypes = ['PACKAGE', 'resolution-body', 'legis-body', 'quoted-block', 'toc', 'toc-content', 'toc-entry', 'list', 'meta-legis-body'];
export const resetIndentTypes = ['section', 'preamble'];

export function provisionsDBtoDisplayChunk(dbProvisionsSorted: ProvisionRecord[], parentIndentLevel: number): DisplayProvision {
  const rootProvision = dbProvisionsSorted[0];
  if (!rootProvision) throw Error("No valid provisions provided");
  const isOnlyChildren = onlyChildrenTypes.includes(rootProvision.provisionType ?? '');
  const shouldResetIndent = resetIndentTypes.includes(rootProvision.provisionType ?? '') && !rootProvision.provisionTag?.includes('quoted-block');
  const indentLevel = shouldResetIndent ? 3 : parentIndentLevel + 1;
  if (dbProvisionsSorted.length == 1) {
    return {
      ...rootProvision,
      indentLevel: indentLevel,
      children: []
    }
  }
  const indices = dbProvisionsSorted.map((_p, i) => i)
  const childIndices = indices
    .filter(i => dbProvisionsSorted[i]?.parentLocation == rootProvision.location && dbProvisionsSorted[i].location != rootProvision.location);
  const childProvisions = childIndices.map((i, ci) => provisionsDBtoDisplayChunk(dbProvisionsSorted.slice(i, childIndices[ci + 1] ?? undefined), indentLevel));
  const rootProvisionDisplay: DisplayProvision = {
    ...rootProvision,
    indentLevel: indentLevel,
    children: childProvisions.filter(d => !!d)
  }
  return rootProvisionDisplay;
}

export function modifyXML(xmlString: string) {
  const parser = new DOMParser();

  // xml modifications
  const parsedXml = parser.parseFromString(xmlString, 'text/xml');
  const legisType = parsedXml.getElementsByTagName('legis-type').item(0);
  const currentChamber = parsedXml.getElementsByTagName('current-chamber').item(0);
  currentChamber?.insertAdjacentHTML("beforebegin", "<hr />");
  legisType?.insertAdjacentHTML("beforebegin", "<hr />");

  return parsedXml;
}

function provisionFromXML(document: Node, packageid: string, location: number, parentLocation: number, level: number, parentTag: string, isDuplicate: boolean = false): ProvisionRecord {
  const serializer = new XMLSerializer();
  const children = Array.from(document.childNodes).filter(child => !!child);
  const enumNode = children.find(d => d.nodeName == "enum"),
    headerNode = children.find(d => d.nodeName == "header");
  let textNode = children.find(d => d.nodeName == "text");
  const provisionType = document.nodeName;
  const documentAsTextTypes = ['continuation-text', 'list-item', 'entry'];
  if (documentAsTextTypes.includes(provisionType)) {
    textNode = document as ChildNode;
  }
  const enumText = enumNode?.textContent;
  const repeatedTypes = ['toc-entry', 'appropriations-small', 'appropriations-intermediate', 'appropriations-major']
  const provisionTag = `${parentTag ? parentTag + '-' : ''}${provisionType}-${enumText ? enumText + (isDuplicate ? '-duplicate' : '') : location}`
  return {
    packageid,
    location,
    parentLocation,
    level,
    provisionType,
    provisionTag,
    text: textNode ? serializer.serializeToString(textNode) : '',
    header: headerNode ? serializer.serializeToString(headerNode) : '',
    enum: enumNode ? serializer.serializeToString(enumNode) : '',
    displayTag: ''
  }
}

export function xmlRootProvision(packageDocument: Document) {
  const rootProvisionTypes = ['meta-legis-body', 'legis-body', 'preamble', 'resolution-body'];
  const rootProvisions = rootProvisionTypes.map(rpt => Array.from(packageDocument.getElementsByTagName(rpt))).flat();
  // Remove elements that are descendants of other found elements
  const filtered = rootProvisions.filter(el =>
    !rootProvisions.some(other => other !== el && other.contains(el))
  );
  const packageProvision = document.createElement("package");
  filtered.forEach(p => packageProvision.appendChild(p));
  return packageProvision;
}

export function provisionsXMLtoDisplay(document: Node, packageid: string, location: number, parentLocation: number, level: number, parentIndentLevel: number, parentTag: string, isDuplicate: boolean = false): DisplayProvision {
  const noDisplayTypes = ["metadata", "after-quoted-block"];
  const leafNodeTypes = ["enum", "header", "text", "#text", "italic", "external-xref"].concat(noDisplayTypes);
  const childNodes = Array.from(document.childNodes).filter(child => !!child);
  const childProvisions = childNodes.filter(d => !leafNodeTypes.includes(d.nodeName));
  const rootProvision = provisionFromXML(document, packageid, location, parentLocation, level, parentTag, isDuplicate);
  let children: DisplayProvision[] = [];
  const shouldResetIndent = resetIndentTypes.includes(rootProvision.provisionType ?? '') && !rootProvision.provisionTag?.includes('quoted-block');
  const indentLevel = shouldResetIndent ? 3 : parentIndentLevel + 1;
  const childTypeEnums = childProvisions.map(c => `${c.nodeName}-${Array.from(c.childNodes).find(d => d.nodeName == "enum")?.textContent}`)
  for (const [i, child] of childProvisions.entries()) {
    let childLocation = location + 1;
    let lastChild = children[children.length - 1];
    const duplicateEnum = childTypeEnums.indexOf(childTypeEnums[i] ?? "") < i;
    while (lastChild?.children) {
      childLocation = lastChild.location + 1;
      lastChild = lastChild.children[lastChild.children.length - 1];
    }
    const childDisplay = provisionsXMLtoDisplay(child, packageid, childLocation, location, level + 1, indentLevel, rootProvision.provisionTag ?? '', duplicateEnum);
    children = children.concat([childDisplay]);
  }
  return {
    ...rootProvision,
    indentLevel: indentLevel,
    children: children
  }
}

function provisionDisplayToDB(displayProvision: DisplayProvision): ProvisionRecord[] {
  const { children, indentLevel, ...rootProvision } = displayProvision;
  let provisions = [rootProvision];
  for (const child of children) {
    provisions = provisions.concat(provisionDisplayToDB(child))
  }
  return provisions;
}

export function provisionsXMLtoDB(document: Node, packageid: string) {
  return provisionDisplayToDB(provisionsXMLtoDisplay(document, packageid, 0, 0, 1, 1, ''));
}

type Activity = {
  item: {
    name: string
    date: string
  }
}

export type BillStatus = {
  billStatus: {
    version: string
    bill: {
      number: string
      updateDate: string
      updateDateIncludingText: string
      originChamber: string
      originChamberCode: string
      type: string
      introducedDate: string
      congress: string
      cdata: {
        constitutionalAuthorityStatementText: string
      }
      committees: {
        item: {
          systemCode: string
          name: string
          chamber: string
          type: string
          subcommittees: {
            item: {
              systemCode: string
              name: string
              activities: Activity[]
            }
          }[]
          activities: Activity[]
        }
      }[]
      actions: {
        item: {
          actionDate: string
          text: string
          type: string
          actionCode: string
          sourceSystem: {
            code: string
            name: string
          }
        }
      }[]
      sponsors: {
        item: {
          bioguideId: string
          fullName: string
          firstName: string
          lastName: string
          party: string
          state: string
          middleName: string
          district: string
          isByRequest: string
        }
      }[]
      cosponsors: {
        item: {
          bioguideId: string
          fullName: string
          firstName: string
          lastName: string
          party: string
          state: string
          district: string
          sponsorshipDate: string
          isOriginalCosponsor: string
        }
      }[]
      cboCostEstimates: {
        item: {
          pubDate: string
          title: string
          url: string
          description: string
        }
      }[]
      policyArea: {
        name: string
      }
      subjects: {
        legislativeSubjects: {
          item: {
            name: string
            updateDate: string
          }
        }[]
        policyArea: {
          name: string
          updateDate: string
        }
      }
      summaries: {
        summary: {
          versionCode: string
          actionDate: string
          actionDesc: string
          updateDate: string
          cdata: {
            text: string
          }
        }
      }[]
      title: string
      titles: {
        titleType: string
        titleTypeCode: string
        title: string
        updateDate: string
        billTextVersionName: string
        billTextVersionCode: string
      }[]
      textVersions: {
        item: {
          type: string
          date: string
          formats: {
            item: {
              url: string
            }
          }
        }
      }[]
      latestAction: {
        actionDate: string
        text: string
      }
    }
    dublinCore: {
      "dc:format": string
      "dc:language": string
      "dc:rights": string
      "dc:contributor": string
      "dc:description": string
    }
  }
}

export type BillSummary = {
  originChamber: string
  references: Array<{
    contents: Array<{
      label: string
      title: string
      sections: Array<string>
    }>
    collectionCode: string
    collectionName: string
  }>
  congress: string
  session: string
  detailsLink: string
  shortTitle: Array<{
    type: string
    title: string
  }>
  isPrivate: string
  title: string
  branch: string
  isAppropriation: string
  collectionName: string
  download: {
    premisLink: string
    xmlLink: string
    txtLink: string
    zipLink: string
    modsLink: string
    pdfLink: string
  }
  pages: string
  related: {
    billStatusLink: string
  }
  relatedLink: string
  members: Array<{
    role: string
    chamber: string
    congress: string
    bioGuideId: string
    name: Array<{
      "authority-lnf": string
      "authority-other"?: string
      parsed: string
      "authority-fnf": string
    }>
    memberName: string
    state: string
    party: string
  }>
  suDocClassNumber: string
  dateIssued: string
  currentChamber: string
  billVersion: string
  billType: string
  packageId: string
  committees: Array<{
    authorityId: string
    chamber: string
    committeeName: string
    type: string
  }>
  collectionCode: string
  governmentAuthor2: string
  governmentAuthor1: string
  publisher: string
  docClass: string
  lastModified: string
  category: string
  billNumber: string
  otherIdentifier: {
    "migrated-doc-id": string
    "parent-ils-system-id": string
    "child-ils-title": string
    "parent-ils-title": string
    "child-ils-system-id": string
    "stock-number": string
  }
}
