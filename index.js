#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

class LandsProcessor {
  #htmlFilePath;
  #dom;

  constructor(htmlFilePath) {
    this.#htmlFilePath = htmlFilePath;
    this.#dom = null;
  }

  async process() {
    await this.loadHtml();
    await this.processLinks();
    await this.processScripts();
    await this.processImages();
    await this.processSrcSet();
    await this.processBackgroundImages();
    await this.processPreloadImages();
    await this.processHead();
    await this.processGeo();
    await this.organizeAssets();
    await this.processCssFiles();
    await this.addGtmIncludes();
    await this.saveHtml();
    await this.organizeMainTwig();
    await this.deleteIndexHtml();
    await this.deleteAssetsDirectory();
    await this.createFileStructure();
  }

  async createFileStructure() {
    const distDir = path.dirname(this.#htmlFilePath);
    const projectName = path.basename(path.resolve(distDir, '..'));

    const blocksDir = path.join(distDir, 'blocks', 'title');
    const configPath = path.join(distDir, 'config.yml');
    const infoPath = path.join(blocksDir, 'info.yml');
    const templatePath = path.join(blocksDir, 'template.twig');

    await fs.mkdir(blocksDir, { recursive: true });

    const infoContent = `name: 'Title'\ndefault_content:\n - '${projectName}'\n`;

    await fs.writeFile(infoPath, infoContent, 'utf8');

    const templateContent = `{{ block.content() }}\n`;

    await fs.writeFile(templatePath, templateContent, 'utf8');

    const configContent = `name: '${projectName}'\nlayouts:\n  main: 'Основной'\nareas:\n title:\n  - 'blocks/title'\n`;

    await fs.writeFile(configPath, configContent, 'utf8');

    console.log('File structure has been successfully created.');
  }

  async loadHtml() {
    const html = await fs.readFile(this.#htmlFilePath, 'utf8');

    this.#dom = new JSDOM(html);
  }

  async processLinks() {
    const { document } = this.#dom.window;

    document.querySelectorAll('link[href]').forEach((link) => {
      if (link.href.endsWith('.css')) {
        const fileName = link.href.split('/').pop();

        link.href = `{{ landing.asset('css/${fileName}') }}`;
      }
    });
  }

  async processScripts() {
    const { document } = this.#dom.window;

    document.querySelectorAll('script[src]').forEach((script) => {
      const fileName = script.src.split('/').pop();

      script.src = `{{ landing.asset('js/${fileName}') }}`;
    });
  }

  async processImages() {
    const { document } = this.#dom.window;

    document.querySelectorAll('img[src]').forEach((img) => {
      const fileName = img.src.split('/').pop();

      img.src = `{{ landing.asset('images/${fileName}') }}`;
    });
  }

  async processSrcSet() {
    const { document } = this.#dom.window;

    document.querySelectorAll('[srcset]').forEach((element) => {
      const newSrcSet = element
          .getAttribute('srcset')
          .split(',')
          .map((part) => {
            const [url, descriptor] = part.trim().split(' ');
            const fileName = url.split('/').pop();
            return `{{ landing.asset('images/${fileName}') }} ${descriptor}`;
          })
          .join(', ');
      element.setAttribute('srcset', newSrcSet);
    });
  }

  async processBackgroundImages() {
    const { document } = this.#dom.window;

    document.querySelectorAll('[style*="background-image"]').forEach((element) => {
      let styleContent = element.getAttribute('style');

      styleContent = styleContent.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, url) => {
        const fileName = url.split('/').pop();

        return `url({{ landing.asset('images/${fileName}') }})`;
      });

      element.setAttribute('style', styleContent);
    });
  }

  async processPreloadImages() {
    const { document } = this.#dom.window;

    document.querySelectorAll('link[rel="preload"][as="image"][href]').forEach((link) => {
      const filePath = link.getAttribute('href');
      const fileName = path.basename(filePath);

      link.setAttribute('href', `{{ landing.asset('images/${fileName}') }}`);
    });

    console.log('Preload image links have been successfully processed.');
  }

  async saveHtml() {
    const updatedHtml = this.#dom.serialize();

    await fs.writeFile('dist/main.twig', updatedHtml);

    console.log('The main.twig file has been successfully created.');
  }

  async processHead() {
    const { document } = this.#dom.window;
    const title = document.querySelector('title');

    if (title) {
      title.textContent = '{{ landing.yieldArea(\'title\', [\'blocks/title\']) }}';
    }

    const head = document.querySelector('head');

    if (head) {
      head.insertAdjacentHTML('beforeend', '{{ landing.head() }}');
    }

    console.log('The functions have been successfully added to the head section.');
  }

  async processGeo() {
    const { document } = this.#dom.window;
    const body = document.querySelector('body');
    const html = document.querySelector('html');

    if (body) {
      body.insertAdjacentHTML(
          'beforebegin',
          `{% set user_country = geoip('user_country')|lower %}{% set locale = user_country ? 'locale-' ~ user_country : 'locale-undecided' %}`
      );

      body.className += '{{ locale }}';
    }

    if (html) {
      html.setAttribute('lang', `{{ (geoip('user_country') ?: 'ru')|lower }}`);
    }

    console.log('The Twig markup has been successfully added to the body section and the html lang attribute has been updated.');
  }

  async processCssFiles() {
    const cssDir = path.join('dist', 'css');
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];

    try {
      const files = await fs.readdir(cssDir);

      for (const file of files) {
        const filePath = path.join(cssDir, file);
        const ext = path.extname(file);

        if (ext === '.css') {
          let content = await fs.readFile(filePath, 'utf8');

          content = content.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, url) => {
            const fileName = url.split('/').pop();
            const fileExt = path.extname(fileName).toLowerCase();

            if (imageExtensions.includes(fileExt)) {
              return `url(${quote}../images/${fileName}${quote})`;
            }

            return match;
          });

          await fs.writeFile(filePath, content, 'utf8');

          console.log(`Processed CSS file: ${file}`);
        }
      }
    } catch (err) {
      console.log(`CSS directory does not exist: ${cssDir}`);
    }
  }

  async organizeAssets() {
    const assetTypes = {
      css: ['css', 'css.map'],
      images: ['jpg', 'jpeg', 'avif', 'webp', 'png', 'svg'],
      js: ['js', 'js.map'],
    };

    const directories = ['dist', 'dist/assets'];

    for (const type of Object.keys(assetTypes)) {
      const dirPath = path.join('dist', type);

      await fs.mkdir(dirPath, { recursive: true });
    }

    for (const baseDir of directories) {
      try {
        const files = await fs.readdir(baseDir);

        for (const file of files) {
          const filePath = path.join(baseDir, file);

          if ((await fs.stat(filePath)).isFile()) {
            const ext = file.split('.').pop();
            const fullExt = file.endsWith('.map') ? file.split('.').slice(-2).join('.') : ext;

            if (assetTypes.css.includes(fullExt)) {
              await fs.rename(filePath, path.join('dist/css', file));
            } else if (assetTypes.images.includes(ext)) {
              await fs.rename(filePath, path.join('dist/images', file));
            } else if (assetTypes.js.includes(fullExt)) {
              await fs.rename(filePath, path.join('dist/js', file));
            }
          }
        }
      } catch (err) {
        console.log(`Directory does not exist or could not be read: ${baseDir}`);
      }
    }

    console.log('Assets were successfully organized and relocated.');
  }

  async organizeMainTwig() {
    const layoutsDir = path.join('dist', 'layouts');

    await fs.mkdir(layoutsDir, { recursive: true });
    await fs.rename('dist/main.twig', path.join(layoutsDir, 'main.twig'));

    console.log('The main.twig file has been successfully moved to the layouts directory.');
  }

  async deleteIndexHtml() {
    const indexPath = path.join('dist', 'index.html');

    try {
      await fs.unlink(indexPath);

      console.log('The index.html file has been successfully deleted.');
    } catch (err) {
      console.log('The index.html file does not exist or could not be deleted.');
    }
  }

  async deleteAssetsDirectory() {
    const assetsPath = path.join('dist', 'assets');

    try {
      await fs.rmdir(assetsPath, { recursive: true });

      console.log('The assets directory has been successfully deleted.');
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('The assets directory does not exist.');
      } else {
        console.error('An error occurred while deleting the assets directory:', err);
      }
    }
  }

  async addGtmIncludes() {
    const { document } = this.#dom.window;
    const head = document.querySelector('head');
    const body = document.querySelector('body');

    if (head) {
      head.insertAdjacentHTML('beforeend', `{% include '../../common/templates/gtm/gtm-head.twig' ignore missing %}`);
    }

    if (body) {
      body.insertAdjacentHTML('afterbegin', `{% include '../../common/templates/gtm/gtm-body.twig' ignore missing %}`);
    }

    console.log('GTM includes have been added to head and body.');
  }
}

if (require.main === module) {
  const htmlFilePath = process.argv[2] || 'dist/index.html';
  const processor = new LandsProcessor(htmlFilePath);

  processor.process().catch((err) => console.error(err));
}
