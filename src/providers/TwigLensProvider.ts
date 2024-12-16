import {
    CodeLens,
    CodeLensProvider,
    Range,
    TextDocument,
    window,
} from 'vscode';
import * as util from '../util';

export default class TwigLensProvider implements CodeLensProvider {
    similarIncludeDirectives: string;

    constructor() {
        this.similarIncludeDirectives = util.similarIncludeDirectives;
    }

    async provideCodeLenses(doc: TextDocument): Promise<CodeLens[]> {
        const editor = window.activeTextEditor;
        const links: any = [];

        if (editor) {
            const { uri } = doc;
            util.setWs(uri);

            const currentFile = uri.path;
            const inVendor = util.getDocFullPath(currentFile, false).startsWith('vendor');

            if (!inVendor) {
                /* CopyPath ----------------------------------------------------------------- */
                links.push(
                    new CodeLens(new Range(0, 0, 0, 0), {
                        command : 'sgtv.copyPath',
                        title   : '$(copy) Copy File Path',
                    }),
                );

                /* OpenOriginalFile --------------------------------------------------------- */
                const found = await util.findOriginalFile(currentFile);

                if (found.length) {
                    links.push(
                        new CodeLens(new Range(0, 0, 0, 0), {
                            command   : 'sgtv.openOriginalFile',
                            arguments : [found[0]],
                            title     : '$(preferences-open-settings) Open Original File',
                        }),
                    );
                }
            }

            /* ShowSimilarCall ---------------------------------------------------------- */
            const text = doc.getText();
            const regex = new RegExp(`(?<=(${this.similarIncludeDirectives})\\()['"]([^$*]*?)['"]`, 'g');
            const matches = text.matchAll(regex);

            for (const match of matches) {
                const found = match[0];
                const files = [...await util.searchForContentInFiles(found)].filter((file) => file.detail.toLowerCase() != currentFile.toLowerCase());
                const range = doc.getWordRangeAtPosition(
                    doc.positionAt(match.index),
                    regex,
                );

                if (files.length && range) {
                    links.push(
                        new CodeLens(range, {
                            command   : 'sgtv.showSimilarCall',
                            title     : util.config.codeLensText.replace('#', files.length),
                            arguments : [files, found],
                        }),
                    );
                }
            }
        }

        return links;
    }
}
