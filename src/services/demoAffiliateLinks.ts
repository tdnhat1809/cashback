import { createAffiliateLinkDraft } from '../domain/affiliate';
import type { AffiliateLinkDraft } from '../domain/affiliate';

const STORAGE_KEY = 'hoantienvip.demo-affiliate-links.v1';

const readLinks = (): AffiliateLinkDraft[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const links: unknown = JSON.parse(raw);
    return Array.isArray(links) ? links as AffiliateLinkDraft[] : [];
  } catch {
    return [];
  }
};

const writeLinks = (links: AffiliateLinkDraft[]) => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links));

export const createDemoAffiliateLink = async (sourceUrl: string, publicUserId = 'demo-user-001') => {
  const draft = createAffiliateLinkDraft(sourceUrl, publicUserId);
  const existingLinks = readLinks();
  writeLinks([draft, ...existingLinks]);
  return draft;
};

export const listDemoAffiliateLinks = () => readLinks();
