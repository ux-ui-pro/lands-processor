const fs = require('fs').promises;
const path = require('path');
const FileUtils = require('./file-utils');

class AssetsManager {
    constructor(projectDistDir) {
        this.projectDistDir = projectDistDir;
    }

    async organizeAssets() {
        const assetTypes = {
            css: ['css', 'css.map'],
            images: ['jpg', 'jpeg', 'avif', 'webp', 'png', 'svg'],
            js: ['js', 'js.map'],
            videos: ['mp4', 'webm'],
            audios: ['mp3', 'aac'],
        };

        for (const type of Object.keys(assetTypes)) {
            const dirPath = path.join(this.projectDistDir, type);
            await fs.mkdir(dirPath, { recursive: true });
        }

        const directories = ['dist', 'dist/assets'];
        for (const baseDir of directories) {
            try {
                const files = await fs.readdir(baseDir);
                for (const file of files) {
                    const filePath = path.join(baseDir, file);
                    const stat = await fs.stat(filePath);

                    if (stat.isFile()) {
                        const ext = file.split('.').pop();
                        const fullExt = file.endsWith('.map')
                            ? file.split('.').slice(-2).join('.')
                            : ext;

                        if (assetTypes.css.includes(fullExt)) {
                            await fs.rename(filePath, path.join(this.projectDistDir, 'css', file));
                        } else if (assetTypes.images.includes(ext)) {
                            await fs.rename(filePath, path.join(this.projectDistDir, 'images', file));
                        } else if (assetTypes.js.includes(fullExt)) {
                            await fs.rename(filePath, path.join(this.projectDistDir, 'js', file));
                        } else if (assetTypes.videos.includes(ext)) {
                            await fs.rename(filePath, path.join(this.projectDistDir, 'videos', file));
                        } else if (assetTypes.audios.includes(ext)) {
                            await fs.rename(filePath, path.join(this.projectDistDir, 'audios', file));
                        }
                    }
                }
            } catch (err) {
                console.log(`Directory does not exist or could not be read: ${baseDir}`);
            }
        }

        console.log('Assets were successfully organized and relocated.');
    }

    async processCssFiles() {
        const cssDir = path.join(this.projectDistDir, 'css');
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];

        try {
            const files = await fs.readdir(cssDir);
            for (const file of files) {
                const filePath = path.join(cssDir, file);
                const ext = path.extname(file);
                if (ext === '.css') {
                    let content = await fs.readFile(filePath, 'utf8');
                    content = content.replace(
                        /url\((['"]?)([^'")]+)\1\)/g,
                        (match, quote, url) => {
                            const fileName = url.split('/').pop();
                            const fileExt = path.extname(fileName).toLowerCase();
                            if (imageExtensions.includes(fileExt)) {
                                return `url(${quote}../images/${fileName}${quote})`;
                            }
                            return match;
                        }
                    );
                    await fs.writeFile(filePath, content, 'utf8');
                    console.log(`Processed CSS file: ${file}`);
                }
            }
        } catch (err) {
            console.log(`CSS directory does not exist: ${cssDir}`);
        }
    }

    async deleteIndexHtml() {
        const indexPath = path.join(this.projectDistDir, 'index.html');
        await FileUtils.removeFileIfExists(indexPath);
    }

    async deleteAssetsDirectory() {
        const assetsPath = path.join(this.projectDistDir, 'assets');
        await FileUtils.removeDirIfExists(assetsPath);
    }

    async deleteRootIndexHtml() {
        const indexPath = path.join('dist', 'index.html');
        await FileUtils.removeFileIfExists(indexPath);
    }

    async deleteRootAssetsDirectory() {
        const assetsPath = path.join('dist', 'assets');
        await FileUtils.removeDirIfExists(assetsPath);
    }
}

module.exports = AssetsManager;
