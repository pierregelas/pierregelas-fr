// src/services/yamlBuilder.ts
// Helper util: pushYamlBlock — insère un bloc YAML multiligne (|) avec indentation.

export function pushYamlBlock(lines: string[], key: string, value: string | null | undefined): void {
  const normalised = (value ?? "").replace(/\r\n?/g, "\n");
  lines.push(`${key}: |`);
  if (normalised.length === 0) {
		lines.push("  ");
		return;
  }
  const blockLines = normalised.split("\n");
  for (const line of blockLines) {
		lines.push(`  ${line}`);
  }
}
