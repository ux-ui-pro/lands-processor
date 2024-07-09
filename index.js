#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class LandsProcessor {
  #htmlFilePath;

  #dom;

  constructor(htmlFilePath) {
    this.#htmlFilePath = htmlFilePath;
    this.#dom = null;
  }

  process() {
    this.loadHtml();
    this.processLinks();
    this.processScripts();
    this.processImages();
    this.processSrcSet();
    this.processBackgroundImages();
    this.processHead();
    this.processBody();
    this.organizeAssets();
    this.saveHtml();
  }

  loadHtml() {
    const html = fs.readFileSync(this.#htmlFilePath, 'utf8');

    this.#dom = new JSDOM(html);
  }

  processLinks() {
    const { document } = this.#dom.window;

    document.querySelectorAll('link[href]').forEach((link) => {
      if (link.href.endsWith('.css')) {
        const fileName = link.href.split('/').pop();

        link.href = `{{ landing.asset('css/${fileName}') }}`;
      }
    });
  }

  processScripts() {
    const { document } = this.#dom.window;

    document.querySelectorAll('script[src]').forEach((script) => {
      const fileName = script.src.split('/').pop();

      script.src = `{{ landing.asset('js/${fileName}') }}`;
    });
  }

  processImages() {
    const { document } = this.#dom.window;

    document.querySelectorAll('img[src]').forEach((img) => {
      const fileName = img.src.split('/').pop();

      img.src = `{{ landing.asset('images/${fileName}') }}`;
    });
  }

  processSrcSet() {
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

  processBackgroundImages() {
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

  saveHtml() {
    const updatedHtml = this.#dom.serialize();

    fs.writeFileSync('dist/main.twig', updatedHtml);

    console.log('The main.twig file has been successfully created.');
  }

  processHead() {
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

  processBody() {
    const { document } = this.#dom.window;
    const body = document.querySelector('body');

    if (body) {
      const newBodyContent = `{% set user_country = geoip('user_country')|lower %}{% set locale = user_country ? 'locale-' ~ user_country : 'locale-undecided' %}<body class="{{ locale }}">${body.innerHTML}</body>`;
      body.outerHTML = newBodyContent;
    }

    console.log('The body tag has been successfully updated.');
  }

  organizeAssets() {
    const assetTypes = {
      css: ['css', 'css.map'],
      images: ['jpg', 'avif', 'webp', 'png', 'svg'],
      js: ['js', 'js.map'],
    };

    Object.keys(assetTypes).forEach((type) => {
      const dirPath = path.join('dist', type);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    fs.readdirSync('dist').forEach((file) => {
      const filePath = path.join('dist', file);

      if (fs.statSync(filePath).isFile()) {
        const ext = file.split('.').pop();
        const fullExt = file.endsWith('.map') ? file.split('.').slice(-2).join('.') : ext;

        if (assetTypes.css.includes(fullExt)) {
          fs.renameSync(filePath, path.join('dist/css', file));
        } else if (assetTypes.images.includes(ext)) {
          fs.renameSync(filePath, path.join('dist/images', file));
        } else if (assetTypes.js.includes(fullExt)) {
          fs.renameSync(filePath, path.join('dist/js', file));
        }
      }
    });

    console.log('Assets were successfully organised and relocated.');
  }
}

if (require.main === module) {
  const htmlFilePath = process.argv[2] || 'dist/index.html';
  const processor = new LandsProcessor(htmlFilePath);

  processor.process();
}
