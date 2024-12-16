import debounce from 'lodash.debounce';
import {
    commands,
    ExtensionContext,
    languages,
    window,
    workspace,
} from 'vscode';
import * as cmnds from './cmnds';
import LinkProvider from './providers/LinkProvider';
import TwigLensProvider from './providers/TwigLensProvider';
import * as util from './util';

let providers: any = [];

export async function activate(context: ExtensionContext) {
    util.readConfig();

    // config
    workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(util.PACKAGE_NAME)) {
            util.readConfig();
        }
    });

    // command
    context.subscriptions.push(
        commands.registerCommand('sgtv.copyPath', cmnds.copyPath),
        commands.registerCommand('sgtv.showSimilarCall', cmnds.showSimilarCall),
        commands.registerCommand('sgtv.openOriginalFile', cmnds.openOriginalFile),
    );

    // links
    initProviders();
    context.subscriptions.push(
        window.onDidChangeActiveTextEditor(async (e) => {
            await clearAll();
            initProviders();
        }),
    );


    // .twig files changes
    await util.listenForFileChanges(context.subscriptions);
}

const initProviders = debounce(() => {
    providers.push(languages.registerDocumentLinkProvider(['php', 'twig'], new LinkProvider()));

    if (util.config.showCodeLens) {
        providers.push(languages.registerCodeLensProvider(['twig'], new TwigLensProvider()));
    }
}, 250);




function clearAll() {
    return new Promise((res, rej) => {
        providers.map((e) => e.dispose());
        providers = [];

        setTimeout(() => res(true), 500);
    });
}

export function deactivate() {
    clearAll();
}
