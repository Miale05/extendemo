import * as vscode from "vscode";

const BASE_PROMPT = `Eres un asistente experto en Karate DSL. Tu tarea es ayudar a los usuarios a generar documentación y diagramas de secuencia para sus archivos .feature. Puedes responder a comandos específicos como "doc-karate <ruta del archivo .feature>" para generar la documentación correspondiente.`;

const KARATE_DOC_PROMPT = (featureFileName: string, featureContent: string) =>
  `Eres un asistente experto en Karate DSL. Analiza el siguiente archivo .feature y para cada "Scenario" genera un diagrama de secuencia en formato Mermaid. Guarda cada diagrama en un archivo Markdown llamado "${featureFileName}.md" dentro de la carpeta "doc" en la raíz del proyecto. El contenido del archivo es:\n\n${featureContent}\n\nEl diagrama debe estar dentro de un bloque \`\`\`mermaid\`\`\` y el nombre del escenario como título.`;

export function activate(context: vscode.ExtensionContext) {
  const handler: vscode.ChatRequestHandler = async (
    request,
    chatContext,
    stream,
    token
  ) => {
    let prompt = BASE_PROMPT;

    if (request.command === "doc-karate") {
      // Si no se especifica archivo, usa el activo
      let featurePath = request.prompt.trim().split(" ")[0];
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        stream.markdown("No hay una carpeta de proyecto abierta.");
        return;
      }

      // Si no se especifica, usa el archivo activo
      if (!featurePath || !featurePath.endsWith(".feature")) {
        const activeEditor = vscode.window.activeTextEditor;
        if (
          activeEditor &&
          activeEditor.document.fileName.endsWith(".feature")
        ) {
          featurePath = vscode.workspace.asRelativePath(
            activeEditor.document.uri
          );
        } else {
          stream.markdown(
            "Por favor, abre un archivo .feature o indica la ruta."
          );
          return;
        }
      }

      const rootUri = workspaceFolders[0].uri;
      const featureUri = vscode.Uri.joinPath(rootUri, featurePath);
      try {
        const featureContent = (
          await vscode.workspace.fs.readFile(featureUri)
        ).toString();
        const featureFileName =
          featurePath.split("/").pop() ?? "karate.feature";

        // Extraer escenarios y tags para el índice y estructura
        const scenarioRegex = /(@[^\n]+\n)?\s*Scenario(?: Outline)?:\s*(.+)/g;
        let match;
        let scenarios: { name: string; tags: string }[] = [];
        while ((match = scenarioRegex.exec(featureContent)) !== null) {
          scenarios.push({
            tags: match[1]?.trim() || "",
            name: match[2].trim(),
          });
        }

        // Construir índice
        let markdownContent = `# Documentacion ${featureFileName}\n\n## Índice\n`;
        scenarios.forEach((sc, i) => {
          markdownContent += `- [Scenario ${i + 1}: ${sc.name}](#scenario-${
            i + 1
          }-${sc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")})\n`;
        });
        markdownContent += `\n---\n`;

        // Prompt para el modelo
        let prompt = `Eres un asistente experto en Karate DSL. Analiza el siguiente archivo .feature y para cada "Scenario" genera un diagrama de secuencia en formato Mermaid. Devuelve solo el contenido Markdown con la siguiente estructura para cada escenario:\n\n`;
        prompt += `## Scenario <número>: <nombre del scenario>\n### TAGS: <tags encima del scenario>\n### Diagrama de secuencia:\n\`\`\`mermaid\n<diagrama>\n\`\`\`\n\n`;
        prompt += `El contenido del archivo es:\n\n${featureContent}`;

        const messages = [vscode.LanguageModelChatMessage.User(prompt)];
        const chatResponse = await request.model.sendRequest(
          messages,
          {},
          token
        );

        let scenarioMarkdown = "";
        for await (const fragment of chatResponse.text) {
          scenarioMarkdown += fragment;
          stream.markdown(fragment);
        }

        markdownContent += scenarioMarkdown;

        // Ensure doc folder exists
        const docFolderUri = vscode.Uri.joinPath(rootUri, "doc");
        try {
          await vscode.workspace.fs.stat(docFolderUri);
        } catch {
          await vscode.workspace.fs.createDirectory(docFolderUri);
        }

        // Write markdown file
        const mdUri = vscode.Uri.joinPath(
          docFolderUri,
          `${featureFileName.replace(".feature", "")}.md`
        );
        await vscode.workspace.fs.writeFile(
          mdUri,
          Buffer.from(markdownContent, "utf8")
        );
        stream.markdown(`Archivo generado: \`${mdUri.fsPath}\``);
        return;
      } catch (err) {
        stream.markdown(`Error al leer el archivo: ${err}`);
        return;
      }
    }
    // ...existing code...

    if (request.command === "doc-karate-all") {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        stream.markdown("No hay una carpeta de proyecto abierta.");
        return;
      }
      const rootUri = workspaceFolders[0].uri;
      // Buscar todos los archivos .feature en el workspace
      const featureFiles = await vscode.workspace.findFiles("**/*.feature");
      if (featureFiles.length === 0) {
        stream.markdown("No se encontraron archivos .feature en el proyecto.");
        return;
      }
      for (const featureUri of featureFiles) {
        try {
          const featureContent = (await vscode.workspace.fs.readFile(featureUri)).toString();
          const featurePath = vscode.workspace.asRelativePath(featureUri);
          const featureFileName = featurePath.split("/").pop() ?? "karate.feature";

          // Extraer escenarios y tags para el índice y estructura
          const scenarioRegex = /(@[^\n]+\n)?\s*Scenario(?: Outline)?:\s*(.+)/g;
          let match;
          let scenarios: { name: string; tags: string }[] = [];
          while ((match = scenarioRegex.exec(featureContent)) !== null) {
            scenarios.push({
              tags: match[1]?.trim() || "",
              name: match[2].trim(),
            });
          }

          // Construir índice
          let markdownContent = `# Documentacion ${featureFileName}\n\n## Índice\n`;
          scenarios.forEach((sc, i) => {
            markdownContent += `- [Scenario ${i + 1}: ${sc.name}](#scenario-${
              i + 1
            }-${sc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")})\n`;
          });
          markdownContent += `\n---\n`;

          // Prompt para el modelo
          let prompt = `Eres un asistente experto en Karate DSL. Analiza el siguiente archivo .feature y para cada "Scenario" genera un diagrama de secuencia en formato Mermaid. Devuelve solo el contenido Markdown con la siguiente estructura para cada escenario:\n\n`;
          prompt += `## Scenario <número>: <nombre del scenario>\n### TAGS: <tags encima del scenario>\n### Diagrama de secuencia:\n\`\`\`mermaid\n<diagrama>\n\`\`\`\n\n`;
          prompt += `El contenido del archivo es:\n\n${featureContent}`;

          const messages = [vscode.LanguageModelChatMessage.User(prompt)];
          const chatResponse = await request.model.sendRequest(messages, {}, token);

          let scenarioMarkdown = "";
          for await (const fragment of chatResponse.text) {
            scenarioMarkdown += fragment;
          }

          markdownContent += scenarioMarkdown;

          // Ensure doc folder exists
          const docFolderUri = vscode.Uri.joinPath(rootUri, "doc");
          try {
            await vscode.workspace.fs.stat(docFolderUri);
          } catch {
            await vscode.workspace.fs.createDirectory(docFolderUri);
          }

          // Write markdown file
          const mdUri = vscode.Uri.joinPath(
            docFolderUri,
            `${featureFileName.replace(".feature", "")}.md`
          );
          await vscode.workspace.fs.writeFile(
            mdUri,
            Buffer.from(markdownContent, "utf8")
          );
          stream.markdown(`Archivo generado: \`${mdUri.fsPath}\``);
        } catch (err) {
          stream.markdown(`Error al procesar ${featureUri.fsPath}: ${err}`);
        }
      }
      return;
    }

    // ...existing code for history and normal chat...
    let messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const previousMessages = chatContext.history.filter(
      (h) => h instanceof vscode.ChatResponseTurn
    );
    previousMessages.forEach((m) => {
      let fullMessage = "";
      m.response.forEach((r) => {
        const mdPart = r as vscode.ChatResponseMarkdownPart;
        fullMessage += mdPart.value.value;
      });
      messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
    });
    messages.push(vscode.LanguageModelChatMessage.User(request.prompt));
    const chatResponse = await request.model.sendRequest(messages, {}, token);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
    return;
  };

  const doki = vscode.chat.createChatParticipant("chat-doc.doki", handler);
  doki.iconPath = vscode.Uri.joinPath(context.extensionUri, "tutor.jpeg");
}

export function deactivate() {}
