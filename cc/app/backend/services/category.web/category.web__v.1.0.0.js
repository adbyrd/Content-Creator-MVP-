/**
 * Backend Service: Category Management
 * Path: /backend/services/category.web.js
 * Version: [cc-v1.0.0]
 */

import wixData from 'wix-data';
import { webMethod, Permissions } from 'wix-web-module';

const TAXONOMY_VERSION = 'v1';
const COLLECTION_ID = 'BusinessCategories';

function norm(s) {
  return (s || '').toString().trim();
}

export const getTaxonomy = webMethod(Permissions.Anyone, async () => {
  try {
    const { items } = await wixData
      .query(COLLECTION_ID)
      .eq('isActive', true)
      .limit(1000)
      .find();

    const parentMap = new Map();
    const childrenByParent = {};

    items.forEach((row) => {
      const parentSlug = norm(row.parentSlug);
      const parentLabel = norm(row.parentLabel);
      const childSlug = norm(row.subCategory);
      const childLabel = norm(row.subLabel);

      if (!parentSlug || !parentLabel) return;

      if (!parentMap.has(parentSlug)) {
        parentMap.set(parentSlug, { label: parentLabel, value: parentSlug });
        childrenByParent[parentSlug] = [];
      }

      if (childSlug && childLabel) {
        childrenByParent[parentSlug].push({ label: childLabel, value: childSlug });
      }
    });

    const parentOptions = Array.from(parentMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    Object.keys(childrenByParent).forEach((p) => {
      childrenByParent[p].sort((a, b) => a.label.localeCompare(b.label));
    });

    return { version: TAXONOMY_VERSION, parentOptions, childrenByParent };
  } catch (err) {
    console.error('[categoryService] getTaxonomy failed', err);
    throw err;
  }
});