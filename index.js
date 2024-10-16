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
    await this.processHead();
    await this.processGeo();
    await this.processGtm();
    await this.organizeAssets();
    await this.processCssFiles();
    await this.saveHtml();
    await this.organizeMainTwig();
    await this.deleteIndexHtml();
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
      const newSrcSet = element.getAttribute('srcset').split(',').map((part) => {
        const [url, descriptor] = part.trim().split(' ');
        const fileName = url.split('/').pop();

        return `{{ landing.asset('images/${fileName}') }} ${descriptor}`;
      }).join(', ');

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
      body.insertAdjacentHTML('beforebegin', `{% set user_country = geoip('user_country')|lower %}{% set locale = user_country ? 'locale-' ~ user_country : 'locale-undecided' %}`);
      body.className += '{{ locale }}';
    }

    if (html) {
      html.setAttribute('lang', `{{ (geoip('user_country') ?: 'ru')|lower }}`);
    }

    console.log('The Twig markup has been successfully added to the body section and the html lang attribute has been updated.');
  }

  async processGtm() {
    const { document } = this.#dom.window;
    const body = document.querySelector('body');

    if (body) {
      body.insertAdjacentHTML('beforeend', '{{ getJsCodeGTM() }}');
    }

    console.log('The GTM code has been successfully added before the closing </body> tag.');
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

    for (const type of Object.keys(assetTypes)) {
      const dirPath = path.join('dist', type);

      await fs.mkdir(dirPath, { recursive: true });
    }

    const files = await fs.readdir('dist');

    for (const file of files) {
      const filePath = path.join('dist', file);

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

    console.log('Assets were successfully organised and relocated.');
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
}

if (require.main === module) {
  const htmlFilePath = process.argv[2] || 'dist/index.html';
  const processor = new LandsProcessor(htmlFilePath);

  processor.process().catch(err => console.error(err));
}
