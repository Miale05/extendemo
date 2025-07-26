// @ts-nocheck
const { generarDocumentacionDesdeFeature } = require("./core");
const path = require("path");
const { commands } = require("vscode");
const vscode = require("vscode");

async function handleDocKarate(context, params) {
  const archivo = params?.featureFile;
  if (!archivo) {
    return {
      type: "text",
      content: "❗ Debes proporcionar la ruta del archivo `.feature` (por ejemplo: `/tests/usuarios.feature`)"
    };
  }

  try {
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const absPath = path.join(wsFolder, archivo);
    const result = await generarDocumentacionDesdeFeature(absPath);

    return {
      type: "text",
      content: `✅ Documentación generada: ${result}`
    };
  } catch (err) {
    return {
      type: "text",
      content: `❌ Error generando documentación: ${err.message}`
    };
  }
}

module.exports = {
  handleDocKarate
};
