/**
 * Backend Service: Category Management
 * Path: /backend/services/category.web.js
 * Version: [cc-v1.0.2]
 */

import wixData from 'wix-data';
import { webMethod, Permissions } from 'wix-web-module';

const COLLECTION_ID = 'BusinessCategories';

function norm(s) {
  return (s || '').toString().trim();
}

export const getTaxonomy = webMethod(Permissions.Anyone, async () => {
  try {
    const { items } = await wixData
      .query(COLLECTION_ID)
      .eq('active', true)
      .limit(1000)
      .find();

    const parentMap = new Map();
    const childrenByParent = {};

    items.forEach((row) => {
      const pValue = row.parentCategory; 
      const pLabel = row.parentLabel;
      const cValue = row.subCategory;
      const cLabel = row.subLabel;

      if (!pValue || !pLabel) return;

      if (!parentMap.has(pValue)) {
        parentMap.set(pValue, { label: pLabel, value: pValue });
        childrenByParent[pValue] = [];
      }

      if (cValue && cLabel) {
        childrenByParent[pValue].push({ label: cLabel, value: cValue });
      }
    });

    return { 
        ok: true, 
        parentOptions: Array.from(parentMap.values()).sort((a, b) => a.label.localeCompare(b.label)), 
        childrenByParent 
    };

  } catch (err) {
    console.error(`[cc-v1.0.5] getTaxonomy failed:`, err);
    return { ok: false, parentOptions: [], childrenByParent: {} };
  }
});