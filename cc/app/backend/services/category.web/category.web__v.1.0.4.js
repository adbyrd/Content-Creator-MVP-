/**
 * Backend Service: Category Management
 * Path: /backend/services/category.web.js
 * Version: [Category Management: v1.0.4]
 */

import wixData from 'wix-data';
import { webMethod, Permissions } from 'wix-web-module';

const COLLECTION_ID = 'categories';

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

        if (items.length === 0) {
            console.warn('[cc-v1.0.6] No active categories found in database.');
            return { ok: false, error: 'EMPTY_COLLECTION' };
        }

        const parentMap = new Map();
        const childrenByParent = {};

        items.forEach((row) => {
            const pValue = row.parentCategory; // Header: "Parent Category"
            const pLabel = row.parentLabel;    // Header: "Parent Label"
            const cValue = row.subCategory;     // Header: "Sub Category"
            const cLabel = row.subLabel;        // Header: "Sub Label"

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
        console.error(`[cc-v1.0.6] getTaxonomy failed:`, err);
        return { ok: false, error: err.message };
    }
});