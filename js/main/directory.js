const fs = require("fs");
const path = require("path");
const dirTree = require("directory-tree");

function generateDirectoryTree(rootPath) {
  const tree = dirTree(rootPath, {
    normalizePath: true,
    exclude: /node_modules|\.git/,
  });

  function formatTree(node, depth = 0, isLast = false) {
    const indent = " ".repeat(depth * 4);
    let result = `${indent}${depth > 0 ? (isLast ? "└── " : "├── ") : ""}${
      node.name
    }\n`;

    if (node.children) {
      node.children.forEach((child, i) => {
        result += formatTree(child, depth + 1, i === node.children.length - 1);
      });
    }
    return result;
  }

  return formatTree(tree);
}

function calculateDirectoryStats(dirPath) {
  let totalFiles = 0;
  let totalSize = 0;

  function traverseDirectory(currentPath) {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(currentPath, item.name);

      if (item.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (item.isFile()) {
        totalFiles++;
        try {
          const stats = fs.statSync(fullPath);
          totalSize += stats.size;
        } catch (error) {
          console.error(`Error getting stats for ${fullPath}:`, error);
        }
      }
    }
  }

  try {
    if (fs.existsSync(dirPath)) {
      traverseDirectory(dirPath);
    }
  } catch (error) {
    console.error(`Error calculating directory stats:`, error);
  }

  return { files: totalFiles, size: totalSize };
}

module.exports = {
  generateDirectoryTree,
  calculateDirectoryStats,
};
