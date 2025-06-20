import * as vscode from 'vscode';

export class OberonDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    
    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        
        const symbols: vscode.DocumentSymbol[] = [];
        const text = document.getText();
        
        try {
            // Parse the module structure
            const moduleSymbol = this.parseModule(text, document);
            if (moduleSymbol) {
                symbols.push(moduleSymbol);
            }
        } catch (error) {
            console.error('Error parsing Oberon symbols:', error);
        }
        
        return symbols;
    }
    
    private parseModule(text: string, document: vscode.TextDocument): vscode.DocumentSymbol | null {
        // Find module declaration
        const moduleMatch = text.match(/^\s*MODULE\s+(\w+)\s*;/im);
        if (!moduleMatch) {
            return null;
        }
        
        const moduleName = moduleMatch[1];
        const moduleStartPos = document.positionAt(moduleMatch.index!);
        
        // Find module end
        const endPattern = new RegExp(`\\bEND\\s+${moduleName}\\s*\\.`, 'i');
        const endMatch = text.match(endPattern);
        const moduleEndPos = endMatch ? 
            document.positionAt(endMatch.index! + endMatch[0].length) : 
            new vscode.Position(document.lineCount - 1, 0);
        
        const moduleRange = new vscode.Range(moduleStartPos, moduleEndPos);
        
        const moduleSymbol = new vscode.DocumentSymbol(
            moduleName,
            'Module',
            vscode.SymbolKind.Module,
            moduleRange,
            moduleRange
        );
        
        // Parse sections within the module - now pass the full text and document
        
        // Parse IMPORT section
        const importSymbols = this.parseImportSection(text, document);
        if (importSymbols.length > 0) {
            const importContainer = new vscode.DocumentSymbol(
                'IMPORTS',
                'Import Section',
                vscode.SymbolKind.Namespace,
                importSymbols[0].range,
                importSymbols[0].range
            );
            importSymbols.forEach(symbol => importContainer.children.push(symbol));
            moduleSymbol.children.push(importContainer);
        }
        
        // Parse CONST section
        const constSymbols = this.parseConstSection(text, document);
        if (constSymbols.length > 0) {
            const constContainer = new vscode.DocumentSymbol(
                'CONST',
                'Constants',
                vscode.SymbolKind.Namespace,
                constSymbols[0].range,
                constSymbols[0].range
            );
            constSymbols.forEach(symbol => constContainer.children.push(symbol));
            moduleSymbol.children.push(constContainer);
        }
        
        // Parse TYPE section
        const typeSymbols = this.parseTypeSection(text, document);
        if (typeSymbols.length > 0) {
            const typeContainer = new vscode.DocumentSymbol(
                'TYPE',
                'Type Declarations',
                vscode.SymbolKind.Namespace,
                typeSymbols[0].range,
                typeSymbols[0].range
            );
            typeSymbols.forEach(symbol => typeContainer.children.push(symbol));
            moduleSymbol.children.push(typeContainer);
        }
        
        // Parse VAR section
        const varSymbols = this.parseVarSection(text, document);
        if (varSymbols.length > 0) {
            const varContainer = new vscode.DocumentSymbol(
                'VAR',
                'Variables',
                vscode.SymbolKind.Namespace,
                varSymbols[0].range,
                varSymbols[0].range
            );
            varSymbols.forEach(symbol => varContainer.children.push(symbol));
            moduleSymbol.children.push(varContainer);
        }
        
        // Parse PROCEDURE declarations
        const procSymbols = this.parseProcedures(text, document);
        procSymbols.forEach(symbol => moduleSymbol.children.push(symbol));
        
        return moduleSymbol;
    }
    
    private parseImportSection(text: string, document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        const importMatch = text.match(/\bIMPORT\s+([^;]+);/i);
        
        if (importMatch) {
            const importList = importMatch[1];
            const imports = importList.split(',').map(imp => imp.trim());
            
            for (const imp of imports) {
                // Handle aliased imports (alias := module)
                const aliasMatch = imp.match(/(\w+)\s*:=\s*(\w+)/);
                let importName: string;
                let detail: string;
                
                if (aliasMatch) {
                    importName = aliasMatch[1];
                    detail = `alias for ${aliasMatch[2]}`;
                } else {
                    importName = imp;
                    detail = 'imported module';
                }
                
                const importPos = document.positionAt(importMatch.index!);
                const range = new vscode.Range(importPos, importPos);
                
                symbols.push(new vscode.DocumentSymbol(
                    importName,
                    detail,
                    vscode.SymbolKind.Package,
                    range,
                    range
                ));
            }
        }
        
        return symbols;
    }
    
    private parseConstSection(text: string, document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        
        // Find CONST section
        const constMatch = text.match(/\bCONST\s+(.*?)(?=\b(?:TYPE|VAR|PROCEDURE|BEGIN|END)\b|$)/is);
        if (!constMatch) return symbols;
        
        const constSection = constMatch[1];
        const constSectionOffset = constMatch.index! + constMatch[0].indexOf(constSection);
        
        // Match individual constant declarations
        const constRegex = /^\s*(\w+)(\*?)\s*=\s*([^;]+);/gm;
        let match;
        
        while ((match = constRegex.exec(constSection)) !== null) {
            const constName = match[1];
            const isExported = match[2] === '*';
            const constValue = match[3].trim();
            
            const absolutePosition = constSectionOffset + match.index!;
            const constPos = document.positionAt(absolutePosition);
            const range = new vscode.Range(constPos, constPos);
            
            symbols.push(new vscode.DocumentSymbol(
                constName + (isExported ? '*' : ''),
                `= ${constValue}`,
                vscode.SymbolKind.Constant,
                range,
                range
            ));
        }
        
        return symbols;
    }
    
    private parseTypeSection(text: string, document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        
        // Find TYPE section
        const typeMatch = text.match(/\bTYPE\s+(.*?)(?=\b(?:VAR|PROCEDURE|BEGIN|END)\b|$)/is);
        if (!typeMatch) return symbols;
        
        const typeSection = typeMatch[1];
        const typeSectionOffset = typeMatch.index! + typeMatch[0].indexOf(typeSection);
        
        // Match type declarations - handle multi-line types
        const typeRegex = /^\s*(\w+)(\*?)\s*=\s*([^;]+(?:\s*;\s*[^=\w][^;]*)*);/gms;
        let match;
        
        while ((match = typeRegex.exec(typeSection)) !== null) {
            const typeName = match[1];
            const isExported = match[2] === '*';
            const typeDefinition = match[3].trim().replace(/\s+/g, ' ');
            
            let symbolKind = vscode.SymbolKind.Class;
            if (typeDefinition.includes('RECORD')) {
                symbolKind = vscode.SymbolKind.Struct;
            } else if (typeDefinition.includes('ARRAY')) {
                symbolKind = vscode.SymbolKind.Array;
            } else if (typeDefinition.includes('POINTER')) {
                symbolKind = vscode.SymbolKind.Interface;
            }
            
            const absolutePosition = typeSectionOffset + match.index!;
            const typePos = document.positionAt(absolutePosition);
            const range = new vscode.Range(typePos, typePos);
            
            symbols.push(new vscode.DocumentSymbol(
                typeName + (isExported ? '*' : ''),
                typeDefinition.substring(0, 50) + (typeDefinition.length > 50 ? '...' : ''),
                symbolKind,
                range,
                range
            ));
        }
        
        return symbols;
    }
    
    private parseVarSection(text: string, document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        
        // Find VAR section
        const varMatch = text.match(/\bVAR\s+(.*?)(?=\b(?:PROCEDURE|BEGIN|END)\b|$)/is);
        if (!varMatch) return symbols;
        
        const varSection = varMatch[1];
        const varSectionOffset = varMatch.index! + varMatch[0].indexOf(varSection);
        
        // Match variable declarations
        const varRegex = /^\s*([^:]+):\s*([^;]+);/gm;
        let match;
        
        while ((match = varRegex.exec(varSection)) !== null) {
            const varNames = match[1].split(',').map(name => name.trim());
            const varType = match[2].trim();
            
            for (const varName of varNames) {
                const cleanName = varName.replace('*', '');
                const isExported = varName.includes('*');
                
                const absolutePosition = varSectionOffset + match.index!;
                const varPos = document.positionAt(absolutePosition);
                const range = new vscode.Range(varPos, varPos);
                
                symbols.push(new vscode.DocumentSymbol(
                    cleanName + (isExported ? '*' : ''),
                    `: ${varType}`,
                    vscode.SymbolKind.Variable,
                    range,
                    range
                ));
            }
        }
        
        return symbols;
    }
    
    private parseProcedures(text: string, document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        
        // Match procedure declarations
        const procRegex = /\bPROCEDURE\s+(\w+)(\*?)\s*(\([^)]*\))?\s*(:\s*\w+)?\s*;(.*?)\bEND\s+\1\b/gis;
        let match;
        
        while ((match = procRegex.exec(text)) !== null) {
            const procName = match[1];
            const isExported = match[2] === '*';
            const parameters = match[3] || '';
            const returnType = match[4] || '';
            const procBody = match[5];
            
            const procStartPos = document.positionAt(match.index!);
            const procEndPos = document.positionAt(match.index! + match[0].length);
            
            const range = new vscode.Range(procStartPos, procEndPos);
            const selectionRange = new vscode.Range(procStartPos, procStartPos);
            
            let symbolKind = vscode.SymbolKind.Function;
            if (returnType) {
                symbolKind = vscode.SymbolKind.Function;
            } else {
                symbolKind = vscode.SymbolKind.Method;
            }
            
            const signature = `${procName}${parameters}${returnType}`;
            const procSymbol = new vscode.DocumentSymbol(
                procName + (isExported ? '*' : ''),
                signature,
                symbolKind,
                range,
                selectionRange
            );
            
            // Parse nested procedures within this procedure
            // For nested procedures, we create a simulated document context
            const procBodyStart = match.index! + match[0].indexOf(procBody);
            const nestedProcs = this.parseNestedProcedures(procBody, document, procBodyStart);
            nestedProcs.forEach(nested => procSymbol.children.push(nested));
            
            symbols.push(procSymbol);
        }
        
        return symbols;
    }
    
    private parseNestedProcedures(procBody: string, document: vscode.TextDocument, bodyOffset: number): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        
        // Match nested procedure declarations within the procedure body
        const procRegex = /\bPROCEDURE\s+(\w+)(\*?)\s*(\([^)]*\))?\s*(:\s*\w+)?\s*;(.*?)\bEND\s+\1\b/gis;
        let match;
        
        while ((match = procRegex.exec(procBody)) !== null) {
            const procName = match[1];
            const isExported = match[2] === '*';
            const parameters = match[3] || '';
            const returnType = match[4] || '';
            
            const absoluteStart = bodyOffset + match.index!;
            const absoluteEnd = bodyOffset + match.index! + match[0].length;
            
            const procStartPos = document.positionAt(absoluteStart);
            const procEndPos = document.positionAt(absoluteEnd);
            
            const range = new vscode.Range(procStartPos, procEndPos);
            const selectionRange = new vscode.Range(procStartPos, procStartPos);
            
            let symbolKind = vscode.SymbolKind.Function;
            if (returnType) {
                symbolKind = vscode.SymbolKind.Function;
            } else {
                symbolKind = vscode.SymbolKind.Method;
            }
            
            const signature = `${procName}${parameters}${returnType}`;
            const procSymbol = new vscode.DocumentSymbol(
                procName + (isExported ? '*' : ''),
                signature,
                symbolKind,
                range,
                selectionRange
            );
            
            symbols.push(procSymbol);
        }
        
        return symbols;
    }
}
