import * as vscode from 'vscode';
import { OberonDocumentSymbolProvider } from './symbolProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Oberon-07 extension is now active');

    // Register the document symbol provider
    const symbolProvider = new OberonDocumentSymbolProvider();
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider('o7lang', symbolProvider)
    );
}

export function deactivate() {
    console.log('Oberon-07 extension is now deactivated');
}
