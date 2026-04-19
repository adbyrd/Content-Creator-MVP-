/**
 * Utility: Validation & UI Helpers
 * Path: /public/utils/validation.js
 * Version: [ VALIDATION : v.1.1.0 ]
 */

const VERSION = '[ VALIDATION : v.1.1.0 ]';

export function validateProjectForGeneration(data) {
    const requiredFields = [
        'title', 
        'description', 
        'goal', 
        'offer', 
        'misconception', 
        'targetAudience'
    ];

    for (const field of requiredFields) {
        if (!data[field] || data[field].trim() === "") {
            return {
                isValid: false,
                message: `The ${field} is required to generate a cinematic storyboard.`,
                failedField: field
            };
        }
    }

    return { isValid: true };
}

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

export function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}

export function validateRequired(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

export function createValidationResult(isValid, message = "", errorFields = []) {
    return {
        isValid,
        message,
        errorFields
    };
}

export function safeDisable(selector, disabled = true) {
    const $el = $w(selector);
    if ($el && typeof $el.disable === 'function') {
        disabled ? $el.disable() : $el.enable();
    } else {
        console.warn(`${VERSION} safeDisable: Element ${selector} not found or incompatible.`);
    }
}

export function safeShow(selector) {
    const $el = $w(selector);
    if ($el && typeof $el.expand === 'function') {
        $el.expand();
    }
}

export function safeHide(selector) {
    const $el = $w(selector);
    if ($el && typeof $el.collapse === 'function') {
        $el.collapse();
    }
}

export function humanizeSlug(slug) {
    if (!slug) return '';
    return slug
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}