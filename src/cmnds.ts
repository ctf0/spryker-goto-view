import {
    commands,
    env,
    Range,
    Selection,
    Uri,
    window,
} from 'vscode';
import * as util from './util';

/* Copy --------------------------------------------------------------------- */

export function copyPath() {
    const editor = window.activeTextEditor;

    if (editor) {
        const { fileName } = editor.document;
        const path = util.removeYvesOrZed(
            util.getDocFullPath(fileName, false).replace(/Theme[\\/]default[\\/]/, ''),
        );

        const ph = util.config.copiedPathSurround?.replace('$ph', path) || path;

        env.clipboard.writeText(ph);

        window.showInformationMessage(`Copied: "${ph}"`);
    }
}

export function openOriginalFile(file) {
    return commands.executeCommand('vscode.open', Uri.file(file.path));
}


/* Show Similar ------------------------------------------------------------- */

export async function showSimilarCall(files, query) {
    const len = files.length;
    const all = `Open All (${len})`;

    const list = len <= 1
        ? files
        : [...files, {
            label: all,
        }];

    return window.showQuickPick(
        list,
        {
            ignoreFocusOut : false,
            placeHolder    : `chose file to open (${len})`,
        },
    ).then(async (selection: any) => {
        if (selection) {
            if (selection.label != all) {
                return commands.executeCommand('vscode.open', Uri.file(selection.detail))
                    .then(() => {
                        setTimeout(() => {
                            const editor = window.activeTextEditor;

                            if (editor) {
                                const range = getTextPosition(query, editor.document);

                                if (range) {
                                    editor.selection = new Selection(range.start, range.end);
                                    editor.revealRange(range, 3);
                                }
                            }
                        }, 500);
                    });
            }

            for (const file of files) {
                await commands.executeCommand('vscode.open', Uri.file(file.detail));
            }
        }
    });
}

function getTextPosition(searchFor, doc) {
    const regex = new RegExp(searchFor);
    const match = regex.exec(doc.getText());

    if (match) {
        const pos = doc.positionAt(match.index + match[0].length);

        return new Range(pos, pos);
    }
}
