/**
 * Backend Service: Category Management
 * Path: /backend/services/category.web.js
 * Version: [cc-v1.0.1]
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
      const parentValue = norm(row.parentCategory);
      const parentLabel = norm(row.parentLabel);
      const childValue = norm(row.subCategory);
      const childLabel = norm(row.subLabel);

      if (!parentValue || !parentLabel) return;

      if (!parentMap.has(parentValue)) {
        parentMap.set(parentValue, { label: parentLabel, value: parentValue });
        childrenByParent[parentValue] = [];
      }

      if (childValue && childLabel) {
        childrenByParent[parentValue].push({ label: childLabel, value: childValue });
      }
    });

    const parentOptions = Array.from(parentMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    Object.keys(childrenByParent).forEach((p) => {
      childrenByParent[p].sort((a, b) => a.label.localeCompare(b.label));
    });

    return { 
        ok: true, 
        parentOptions, 
        childrenByParent 
    };

  } catch (err) {
    console.error(`[cc-v1.0.2] getTaxonomy failed:`, err);
    return { ok: false, error: err.message, parentOptions: [], childrenByParent: {} };
  }
});