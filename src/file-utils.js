const fs = require('fs').promises;

class FileUtils {
    static async removeFileIfExists(filePath) {
        try {
            await fs.unlink(filePath);
            console.log(`Removed file: ${filePath}`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log(`File not found (skip): ${filePath}`);
            } else {
                console.error(`Error removing file ${filePath}:`, err);
            }
        }
    }

    static async removeDirIfExists(dirPath) {
        try {
            await fs.rm(dirPath, { recursive: true });

            console.log(`Removed directory: ${dirPath}`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log(`Directory not found (skip): ${dirPath}`);
            } else {
                console.error(`Error removing directory ${dirPath}:`, err);
            }
        }
    }
}

module.exports = FileUtils;
