const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function parseFeatureFile(content) {
  const lines = content.split("\n");
  const scenarios = [];
  let currentTags = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("@")) {
      currentTags.push(line);
    }

    if (line.toLowerCase().startsWith("scenario")) {
      const name =
        line.split(":")[1]?.trim() || `Escenario ${scenarios.length + 1}`;
      scenarios.push({
        name,
        tags: [...currentTags],
        raw: extractScenarioBlock(lines, i),
      });
      currentTags = [];
    }
  }

  return scenarios;
}

function extractScenarioBlock(lines, startIndex) {
  const block = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().toLowerCase().startsWith("scenario") && i !== startIndex)
      break;
    block.push(line);
  }
  return block.join("\n");
}

async function buildMarkdown(fileName, scenarios) {
  let md = `# Documentación ${fileName}.feature\n\n`;
  md += `## Índice\n`;
  scenarios.forEach((s, i) => {
    md += `- [Escenario ${i + 1}: ${s.name}](#escenario-${i + 1}-${s.name
      .toLowerCase()
      .replace(/\s+/g, "-")})\n`;
  });
  md += `\n`;

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const anchorName = s.name.toLowerCase().replace(/\s+/g, "-");

    md += `## Escenario ${i + 1}: ${s.name}\n`;
    md += `### TAGS: ${s.tags.join(", ") || "Ninguno"}\n\n`;

    md += `### Prompt sugerido para Copilot Chat\n`;
    md += `Puedes usar el siguiente prompt en Copilot Chat:\n\n`;

    md += `> Usando el contexto del proyecto \`@workspace\`, genera el script del diagrama de secuencia en formato Mermaid basado en el siguiente escenario de Karate DSL. Asegúrate de envolver el script generado entre tres backticks con \`mermaid\`, así: \` \`\`\`mermaid ... \`\`\` \`\n\n`;

    md += "```gherkin\n";
    md += `${s.raw}\n`;
    md += "```\n\n";
  }

  return md;
}

async function generarDocumentacionDesdeFeature(filePath) {
  const fileName = path.basename(filePath, ".feature");
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    throw new Error("No hay una carpeta abierta en el workspace.");
  }

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const docsDir = path.join(projectRoot, "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const parsed = parseFeatureFile(content);
  const markdown = await buildMarkdown(fileName, parsed);

  const outputPath = path.join(docsDir, `${fileName}.md`);
  fs.writeFileSync(outputPath, markdown);

  return outputPath;
}

module.exports = {
  generarDocumentacionDesdeFeature,
};
