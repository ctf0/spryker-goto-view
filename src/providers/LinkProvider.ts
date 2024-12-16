import escapeStringRegexp from 'escape-string-regexp';
import {
    DocumentLink,
    DocumentLinkProvider,
    TextDocument,
    Uri,
    window,
} from 'vscode';
import * as util from '../util';

export default class LinkProvider implements DocumentLinkProvider {

    similarIncludeDirectives: string;
    widgetCall: string;
    showSimilarIncludeLinks: boolean;

    constructor() {
        this.similarIncludeDirectives = util.similarIncludeDirectives;
        this.widgetCall = util.widgetCall;
        this.showSimilarIncludeLinks = util.config.showSimilarIncludeLinks;
    }

    async provideDocumentLinks(doc: TextDocument): Promise<DocumentLink[]> {
        const editor = window.activeTextEditor;
        const links: DocumentLink[] = [];

        if (editor) {
            const docText = doc.getText();
            const founds: any = [];
            let regex;
            let matches;

            /* Main --------------------------------------------------------------------- */
            regex = new RegExp(/['"](@[^$*]*?)['"]/, 'g');
            matches = docText.matchAll(regex);

            for (const match of matches) {
                const text = match[1];

                founds.push({
                    text      : text,
                    index     : match.index + text.length,
                    removeExt : false,
                });
            }

            /* Other -------------------------------------------------------------------- */
            regex = new RegExp(`(?<=(${this.widgetCall}))['"]([^$*]*?)['"]`, 'g');
            matches = docText.matchAll(regex);

            for (const match of matches) {
                const text = match[2];

                founds.push({
                    text: `${text}.php`,
                    index: match.index + text.length,
                    removeExt: true,
                });
            }

            if (this.showSimilarIncludeLinks) {
                regex = new RegExp(`(?<=(${this.similarIncludeDirectives})\\()['"]([^$*]*?)['"]`, 'g');
                matches = docText.matchAll(regex);

                for (const match of matches) {
                    const text = match[2];

                    founds.push({
                        text      : text.endsWith('.twig') ? text : `${text}.twig`,
                        index     : match.index + text.length,
                        removeExt : true,
                    });
                }
            }

            /* Links -------------------------------------------------------------------- */
            for (const { text, index, removeExt } of founds) {
                const file = await util.getFilePath(text);

                if (!file) {
                    continue;
                }

                const range = doc.getWordRangeAtPosition(
                    doc.positionAt(index),
                    new RegExp(escapeStringRegexp(removeExt ? text.replace(/\.[^/.]+$/, "") : text)),
                );

                if (file && range) {
                    const args = encodeURIComponent(JSON.stringify([file]));
                    const CommandUri = Uri.parse(`command:workbench.action.quickOpen?${args}`);

                    const documentlink: DocumentLink = new DocumentLink(range, CommandUri);
                    documentlink.tooltip = 'jump to file';

                    links.push(documentlink);
                }
            }
        }

        return links;
    }
}
