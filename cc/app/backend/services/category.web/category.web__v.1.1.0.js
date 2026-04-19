/**
 * Backend Service: Category Management
 * Path: /backend/services/category.web.js
 * Version: [ CATEGORY MANAGEMENT : v.1.1.0 ] 
 */

import wixData from 'wix-data';
import { webMethod, Permissions } from 'wix-web-module';

const VERSION = '[ CATEGORY MANAGEMENT : v.1.1.0 ]';
const COLLECTION_ID = 'categories';

export const getTaxonomy = webMethod(Permissions.Anyone, async () => {
    try {
        const { items } = await wixData
            .query(COLLECTION_ID)
            .eq('active', true) 
            .limit(1000)
            .find();

        if (items.length === 0) {
            console.warn(`${VERSION} No active categories found in database.`);
            return { ok: false, error: 'EMPTY_COLLECTION' };
        }

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

        console.log(`${VERSION} Taxonomy successfully generated.`);
        return { 
            ok: true, 
            parentOptions: Array.from(parentMap.values()).sort((a, b) => a.label.localeCompare(b.label)), 
            childrenByParent 
        };

    } catch (err) {
        console.error(`${VERSION} Failed to retrieve taxonomy:`, err);
        return { ok: false, error: err.message };
    }
});