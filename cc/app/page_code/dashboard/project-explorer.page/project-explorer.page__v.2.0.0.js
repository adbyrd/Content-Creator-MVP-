/**
 * Page: Project Explorer
 * Path: /page_code/dashboard/project-explorer.page.js
 * Version: [ PROJECT EXPLORER : v.2.0.0 ]
 *
 * SC-02 / SC-07 — Pagination & Loading State
 * ────────────────────────────────────────────
 * getMyProjects() now returns { data, nextCursor } instead of the full list.
 * This page wires up a "Load More" pattern: the initial load fetches the
 * first page (up to 25 projects); subsequent loads append additional pages.
 *
 * A loading skeleton (#loadingSkeleton) is shown while the initial data
 * fetch resolves, preventing the blank-repeater flash that users on slower
 * connections previously experienced.
 *
 * Canvas element requirements:
 *   #projectRepeater       — repeater bound to project list
 *   #projectCount          — text element showing total count
 *   #btnProject            — "New Project" button
 *   #btnLoadMore           — "Load More" button (hidden when no more pages)
 *   #loadingSkeleton       — collapsible loading placeholder (shown on boot)
 *   #txtProjectTitle       — text in each repeater item
 *   #txtProjectDescription — text in each repeater item
 */

import wixLocation from 'wix-location';
import wixWindow   from 'wix-window';
import { getMyProjects, getUserProjectCount } from 'backend/services/project.web';
import { showToaster }                        from 'public/utils/notification';
import { safeShow, safeHide }                 from 'public/utils/ui';

const VERSION = '[ PROJECT EXPLORER : v.2.0.0 ]';

// ─── MODULE STATE ─────────────────────────────────────────────────────────────

/**
 * Cursor returned by the last getMyProjects() call.
 * null  → no more pages to load.
 * string → pass to the next getMyProjects() call to fetch the next page.
 */
let _nextCursor    = null;

/**
 * Accumulated project list across all loaded pages.
 * The repeater is always set to the full accumulated array so Wix can diff
 * efficiently — do not splice or mutate this array directly.
 */
let _projects      = [];

/** Prevents concurrent load / load-more calls. */
let _isLoading     = false;

// ─── BOOT ─────────────────────────────────────────────────────────────────────

$w.onReady(async function () {
    console.log(`${VERSION} Initializing...`);

    // onItemReady MUST be registered synchronously before any async work.
    // Registering it inside an async callback means Wix will not fire it
    // for the initial data binding and the repeater renders empty.
    $w('#projectRepeater').onItemReady(($item, itemData) => {
        $item('#txtProjectTitle').text       = itemData.title       || 'Untitled Project';
        $item('#txtProjectDescription').text = itemData.description || 'No description provided.';

        $item('#txtProjectTitle').onClick(() => {
            console.log(`${VERSION} Navigating to project: ${itemData._id}`);
            wixLocation.to(`/project/${slugify(itemData.title)}`);
        });
    });

    // Show the loading skeleton while data loads
    safeShow('#loadingSkeleton');
    safeHide('#projectRepeater');
    safeHide('#btnLoadMore');

    handleQueryStatus();
    await loadInitialDashboard();

    $w('#btnProject').onClick(() => openProjectModal());
    $w('#btnLoadMore').onClick(() => loadMoreProjects());
});

// ─── QUERY STATUS ─────────────────────────────────────────────────────────────

/**
 * Checks URL query parameters to surface success toasters after CRUD
 * operations that redirect back to the explorer (e.g., delete + redirect).
 */
function handleQueryStatus() {
    const status = wixLocation.query?.status;
    if (status === 'updated')  showToaster('Project saved successfully.', 'success');
    if (status === 'created')  showToaster('New project created successfully.', 'success');
    if (status === 'deleted')  showToaster('Project deleted.', 'success');
}

// ─── INITIAL LOAD ─────────────────────────────────────────────────────────────

/**
 * Fetches the project count and first page of projects in parallel.
 * Populates the count display, the repeater, and the Load More button state.
 *
 * SC-02: getMyProjects() now returns at most 25 records per page.
 * SC-07: The count query uses _owner (indexed field) in the service layer.
 */
async function loadInitialDashboard() {
    if (_isLoading) return;
    _isLoading = true;

    try {
        // Run both requests in parallel — independent data sources.
        const [countRes, projectRes] = await Promise.all([
            getUserProjectCount(),
            getMyProjects()             // first page, no cursor
        ]);

        // ── Update count display ─────────────────────────────────────────────
        if (countRes.ok) {
            $w('#projectCount').text = `You currently have ${countRes.count} project${countRes.count === 1 ? '' : 's'}.`;
        }

        // ── Populate repeater ────────────────────────────────────────────────
        if (projectRes.ok) {
            _projects    = projectRes.data;
            _nextCursor  = projectRes.nextCursor;
            renderProjectList(_projects);
            updateLoadMoreButton();
        } else {
            console.warn(`${VERSION} loadInitialDashboard: getMyProjects failed.`);
        }

    } catch (err) {
        console.error(`${VERSION} loadInitialDashboard error:`, err);
        showToaster('Unable to load projects. Please refresh the page.', 'error');
    } finally {
        _isLoading = false;
        safeHide('#loadingSkeleton');
    }
}

// ─── LOAD MORE ────────────────────────────────────────────────────────────────

/**
 * Fetches the next page of projects and appends them to the repeater.
 * Called by the #btnLoadMore onClick handler.
 *
 * Only fires when _nextCursor is non-null (enforced by updateLoadMoreButton).
 */
async function loadMoreProjects() {
    if (_isLoading || !_nextCursor) return;
    _isLoading = true;

    console.log(`${VERSION} Loading next page with cursor: ${_nextCursor}`);

    try {
        const res = await getMyProjects({ cursor: _nextCursor });

        if (res.ok) {
            // Append new records to the accumulated list.
            // Setting the full array lets Wix diff and only render new items.
            _projects   = [..._projects, ...res.data];
            _nextCursor = res.nextCursor;
            renderProjectList(_projects);
            updateLoadMoreButton();
        } else {
            console.warn(`${VERSION} loadMoreProjects: getMyProjects failed.`);
            showToaster('Unable to load more projects. Please try again.', 'error');
        }

    } catch (err) {
        console.error(`${VERSION} loadMoreProjects error:`, err);
        showToaster('Unable to load more projects. Please try again.', 'error');
    } finally {
        _isLoading = false;
    }
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

/**
 * Sets the repeater data and toggles its visibility.
 * onItemReady is already wired — only the data assignment is needed here.
 *
 * @param {array} projects
 */
function renderProjectList(projects) {
    const $repeater = $w('#projectRepeater');

    if (!projects || projects.length === 0) {
        $repeater.data = [];
        safeHide('#projectRepeater');
        return;
    }

    $repeater.data = projects;
    safeShow('#projectRepeater');
}

/**
 * Shows or hides the Load More button based on whether a next page exists.
 */
function updateLoadMoreButton() {
    if (_nextCursor) {
        safeShow('#btnLoadMore');
    } else {
        safeHide('#btnLoadMore');
    }
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

/**
 * Opens the Project Settings modal in CREATE mode and refreshes the
 * dashboard on success.
 */
async function openProjectModal() {
    try {
        const result = await wixWindow.openLightbox('Project');

        if (result?.updated) {
            console.log(`${VERSION} New project created. Refreshing dashboard.`);

            // Reset pagination state and reload from page 1 so the new
            // project appears at the top (newest first ordering).
            _projects   = [];
            _nextCursor = null;

            safeShow('#loadingSkeleton');
            safeHide('#projectRepeater');
            await loadInitialDashboard();

            showToaster('Project created successfully!', 'success');

        } else if (result?.errorMessage) {
            showToaster(result.errorMessage, 'error');
        }

    } catch (err) {
        console.error(`${VERSION} openProjectModal error:`, err);
    }
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

/**
 * Converts a project title to a URL-safe slug for dynamic page navigation.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
    return (text || '')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g,    '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g,    '-');
}