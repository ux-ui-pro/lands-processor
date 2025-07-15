const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

const HtmlProcessor   = require('./html-processor');
const AssetsManager   = require('./assets-manager');
const TwigGenerator   = require('./twig-generator');

class LandsProcessor {
    #htmlFilePath;
    #dom;
    #projectDistDir;

    constructor(htmlFilePath) {
        this.#htmlFilePath = htmlFilePath;
        this.#dom          = null;

        const distDir     = path.dirname(htmlFilePath);
        const projectName = path.basename(path.resolve(distDir, '..'));

        this.#projectDistDir = path.join('dist', projectName);
    }

    async process() {
        await this.loadHtml();

        const htmlProcessor  = new HtmlProcessor(this.#dom);
        const assetsManager  = new AssetsManager(this.#projectDistDir);
        const twigGenerator  = new TwigGenerator(this.#dom, this.#projectDistDir);

        htmlProcessor.processLinks();
        htmlProcessor.processScripts();
        htmlProcessor.processImages();
        htmlProcessor.processSvgImages();
        htmlProcessor.processSrcSet();
        htmlProcessor.processBackgroundImages();
        htmlProcessor.processPreloadImages();
        htmlProcessor.processVideos();
        htmlProcessor.processAudios();
        htmlProcessor.processFavicons();
        htmlProcessor.processHead();
        htmlProcessor.processGeo();
        htmlProcessor.addGtmIncludes();

        await assetsManager.organizeAssets();
        await assetsManager.processCssFiles();

        await twigGenerator.saveMainTwig();
        await twigGenerator.organizeMainTwig();

        await assetsManager.deleteIndexHtml();
        await assetsManager.deleteAssetsDirectory();
        await assetsManager.deleteRootIndexHtml();
        await assetsManager.deleteRootAssetsDirectory();

        await twigGenerator.createFileStructure();
    }

    async loadHtml() {
        const html = await fs.readFile(this.#htmlFilePath, 'utf8');
        this.#dom  = new JSDOM(html);
    }
}

module.exports = LandsProcessor;
