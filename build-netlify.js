// build-netlify.js

import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

// --- 配置 ---
const API_DIRECTORY = 'api';
// --- 结束配置 ---

// 递归查找所有 TypeScript 文件
async function findTsFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
			entries.map((entry) => {
				const fullPath = path.join(dir, entry.name);
				return entry.isDirectory() ? findTsFiles(fullPath) : fullPath;
			})
	);
	return files.flat().filter(file => file.endsWith('.ts'));
}

// --- 主程序 ---
console.log('🚀 Starting build script to patch import paths...');

try {
	const tsFiles = await findTsFiles(API_DIRECTORY);
	let modifiedCount = 0;
	
	for (const file of tsFiles) {
		const content = await readFile(file, 'utf-8');
		// 使用 replaceAll 替换所有出现的 .js 为 .ts
		const newContent = content.replaceAll(`'./_lib/util.js'`, `'./_lib/util.ts'`)
															.replaceAll(`"./_lib/util.js"`, `"./_lib/util.ts"`);
		
		if (newContent !== content) {
			await writeFile(file, newContent, 'utf-8');
			console.log(`✅ Patched: ${file}`);
			modifiedCount++;
		}
	}
	
	console.log(`\n✨ Done. Patched ${modifiedCount} file(s).`);
} catch (error) {
	console.error('❌ Script failed:', error);
	process.exit(1); // 退出并让 Netlify 构建失败
}
