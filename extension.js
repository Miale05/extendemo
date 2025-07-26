// @ts-nocheck
const vscode = require("vscode");
const { generarDocumentacionDesdeFeature } = require("./core");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "doki.docKarate",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          "Abre un archivo .feature para generar documentación."
        );
        return;
      }

      const filePath = editor.document.uri.fsPath;
      if (!filePath.endsWith(".feature")) {
        vscode.window.showErrorMessage(
          "El archivo debe tener extensión .feature."
        );
        return;
      }

      try {
        const outputPath = await generarDocumentacionDesdeFeature(filePath);
        vscode.window.showInformationMessage(
          `Documentación generada: ${outputPath}`
        );
      } catch (err) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
