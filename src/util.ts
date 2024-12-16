import escapeStringRegexp from 'escape-string-regexp';
import debounce from 'lodash.debounce';
import { workspace, WorkspaceConfiguration } from 'vscode';

const path = require('path');
export const sep = path.sep;
let ws;

export function setWs(uri) {
    ws = workspace.getWorkspaceFolder(uri)?.uri.fsPath;
}

/* Link --------------------------------------------------------------------- */
export async function getFilePath(text) {
    text = text.replace(/['"]/g, '');

    if (text.startsWith('@')) {
        return text
            .replace('@', '')
            .replace('views', 'Theme/default/views');
    }

    return text;
}


export function getDocFullPath(path, add = true) {
    return add
        ? replaceSlash(`${ws}/${path}`)
        : path.replace(replaceSlash(`${ws}/`), '');
}

/* Lens --------------------------------------------------------------------- */

const findInFiles = require('find-in');
const cache_store_lens = [];
let similarIncludeFilesCache: any = [];

export async function searchForContentInFiles(text) {
    const list = checkCache(cache_store_lens, text);

    if (!list.length) {
        for (const path of similarIncludeFilesCache) {
            const found = await findInFiles({
                path,
                request: [text],
            });

            if (found.some((e) => e.match)) {
                list.push({
                    label  : getLastParts(getDocFullPath(path, false), 3),
                    detail : path,
                });
            }
        }

        saveCache(cache_store_lens, text, list);
    }

    return list;
}


/* Content ------------------------------------------------------------------ */

export async function listenForFileChanges(subscriptions) {
    if (config.watchFilesForChanges) {
        try {
            const watcher = workspace.createFileSystemWatcher(twigFileWatcherRegex);

            subscriptions.push(
                watcher.onDidChange(
                    debounce(async (e) => await saveSimilarIncludeFilesCache(), 60 * 1000),
                ),
            );
        } catch (error) {
            // console.error(error);
        }
    }
}

async function saveSimilarIncludeFilesCache() {
    if (config.showCodeLens) {
        for (const path of config.similarIncludeFilesRegex) {
            similarIncludeFilesCache.push(await workspace.findFiles(path, '**/.*'));
        }

        similarIncludeFilesCache = similarIncludeFilesCache.flat().map((file) => file.path);
    }
}

/* Original ------------------------------------------------------------------ */

const cache_store_lens_original = [];
export async function findOriginalFile(file) {
    let list = checkCache(cache_store_lens_original, file);

    if (!list.length) {
        const newPath = removeYvesOrZed(file);
        const found = await workspace.findFiles(`vendor/**/${newPath}`, '**/.*', 1);

        saveCache(cache_store_lens_original, file, found);
        list = found;
    }

    return list;
}

/* Helpers ------------------------------------------------------------------ */

function checkCache(cache_store, text) {
    const check = cache_store.find((e) => e.key == text);

    return check ? check.val : [];
}

function saveCache(cache_store, text, val) {
    checkCache(cache_store, text).length
        ? false
        : cache_store.push({
            key : text,
            val : val,
        });

    return val;
}

function replaceSlash(item) {
    return item.replace(/[\\/]+/g, sep);
}

export function removeYvesOrZed(str) {
    return str.replace(/.*(Yves|Zed)[\\/]/, '');
}

function getLastParts(text, count) {
    const parts = text.split(sep);

    return parts.slice(-count).join(sep);
}


/* Config ------------------------------------------------------------------- */
export const PACKAGE_NAME = 'sprykerGotoView';

export let config: WorkspaceConfiguration;
export let similarIncludeDirectives = '';
export let widgetCall = '';
let twigFileWatcherRegex = '';

export async function readConfig() {
    config = workspace.getConfiguration(PACKAGE_NAME);
    similarIncludeDirectives = config.similarIncludeDirectives.map((e) => escapeStringRegexp(replaceSlash(e))).join('|');
    widgetCall = config.widgetCall.map((e) => escapeStringRegexp(replaceSlash(e))).join('|');
    twigFileWatcherRegex = config.twigFileWatcherRegex;

    await saveSimilarIncludeFilesCache();
}
