// @ts-nocheck
// 扫描指定目录直接孩子的所有 .ts 文件，将 import 语句中的 .js 后缀替换为 .ts

const targetDir = "api";

console.log(`🔍 Scanning directory: ${targetDir}`);

try {
  for await (const entry of Deno.readDir(targetDir)) {
    // 只处理 src 目录下的 .ts 文件
    if (entry.isFile && entry.name.endsWith(".ts")) {
      const filePath = `${targetDir}/${entry.name}`;

      const originalContent = await Deno.readTextFile(filePath);

      // 将 import/export 语句中的 '.js' 替换为 '.ts'
      const newContent = originalContent.replace(
        /((?:import|export)\s+.*?\s*from\s*['"])([^'"]+)\.js(['"])/g,
        "$1$2.ts$3"
      );

      // 如果内容有变化，则写回文件
      if (originalContent !== newContent) {
        await Deno.writeTextFile(filePath, newContent);
        console.log(`✅ Updated: ${filePath}`);
      }
    }
  }
  console.log("\n✨ Done.");
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  Deno.exit(1);
}
