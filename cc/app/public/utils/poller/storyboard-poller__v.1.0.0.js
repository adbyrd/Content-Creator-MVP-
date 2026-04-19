/**
 * Utility: Poller
 * Path: /public/utils/poller.js
 * VERSION: [ POLLER : v.1.0.0 ]
 */

import { getStoryboardFrames } from 'backend/services/project.web';
 
const VERSION          = '[ STORYBOARD POLLER : v.1.0.0 ]';

const POLL_INTERVAL_MS = 4000;   // Check every 4 seconds
const POLL_TIMEOUT_MS  = 600000; // 10-minute hard timeout (n8n pipeline budget)
const TOTAL_FRAMES     = 15;
 
/**
 * Starts the polling loop for a given project's storyboard frames.
 *
 * The loop:
 *   - Calls getStoryboardFrames() every POLL_INTERVAL_MS
 *   - Fires onFrame() for each NEW frame that wasn't present in the last tick
 *   - Fires onComplete() when all 15 frames are confirmed
 *   - Fires onTimeout() if POLL_TIMEOUT_MS elapses without completion
 *   - Fires onError() on backend failure
 *
 * Returns a controller object with a stop() method.
 *
 * @param {string} projectId
 * @param {{ onFrame, onComplete, onTimeout, onError }} callbacks
 * @returns {{ stop: () => void }}
 */
export function startStoryboardPolling(projectId, { onFrame, onComplete, onTimeout, onError } = {}) {
    if (!projectId) {
        console.error(`${VERSION} startStoryboardPolling: No projectId supplied.`);
        return { stop: () => {} };
    }
 
    let intervalId     = null;
    let timeoutId      = null;
    let seenFrameIds   = new Set();
    let stopped        = false;
 
    console.log(`${VERSION} Polling started for project: ${projectId}`);
 
    // ── Hard timeout guard ──────────────────────────────────────────────────
    timeoutId = setTimeout(() => {
        if (stopped) return;
        console.warn(`${VERSION} Polling timed out after ${POLL_TIMEOUT_MS / 1000}s for project: ${projectId}`);
        cleanup();
        if (typeof onTimeout === 'function') onTimeout();
    }, POLL_TIMEOUT_MS);
 
    // ── Poll tick ───────────────────────────────────────────────────────────
    async function tick() {
        if (stopped) return;
 
        try {
            const result = await getStoryboardFrames(projectId);
 
            if (!result.ok) {
                const errType = result.error?.type || 'UNKNOWN';
                console.error(`${VERSION} Poll tick error: ${errType} for project: ${projectId}`);
 
                // AUTH_REQUIRED / FORBIDDEN are terminal — stop polling
                if (['AUTH_REQUIRED', 'FORBIDDEN', 'NOT_FOUND'].includes(errType)) {
                    cleanup();
                    if (typeof onError === 'function') onError(result.error);
                }
                // Other errors (network hiccup) — tolerate and retry on next tick
                return;
            }
 
            const { frames = [], projectStatus, frameCount } = result;
 
            // Fire onFrame for each frame we haven't seen yet, in order
            for (const frame of frames) {
                if (!seenFrameIds.has(frame._id)) {
                    seenFrameIds.add(frame._id);
                    console.log(`${VERSION} New frame received: index ${frame.frameIndex} | project: ${projectId}`);
                    if (typeof onFrame === 'function') onFrame(frame, frames);
                }
            }
 
            // Completion check
            const isDone = projectStatus === 'complete' || frameCount >= TOTAL_FRAMES;
 
            if (isDone) {
                console.log(`${VERSION} All frames received for project: ${projectId}. Stopping poll.`);
                cleanup();
                if (typeof onComplete === 'function') onComplete(frames);
            }
 
        } catch (err) {
            console.error(`${VERSION} Unexpected polling error:`, err);
            // Don't stop — tolerate transient failures
        }
    }
 
    // ── Start loop ──────────────────────────────────────────────────────────
    // Run immediately on first call, then on interval
    tick();
    intervalId = setInterval(tick, POLL_INTERVAL_MS);
 
    // ── Cleanup ─────────────────────────────────────────────────────────────
    function cleanup() {
        stopped = true;
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        if (timeoutId)  { clearTimeout(timeoutId);   timeoutId  = null; }
        console.log(`${VERSION} Poll loop terminated for project: ${projectId}`);
    }
 
    return { stop: cleanup };
}

/**
 * Convenience alias — stops an active polling instance.
 * Accepts the object returned by startStoryboardPolling().
 *
 * @param {{ stop: () => void } | null} pollerInstance
 */
export function stopStoryboardPolling(pollerInstance) {
    if (pollerInstance && typeof pollerInstance.stop === 'function') {
        pollerInstance.stop();
    }
}