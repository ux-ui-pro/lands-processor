const path = require('path');

class HtmlProcessor {
    constructor(dom) {
        this.dom = dom;
    }

    processLinks() {
        const { document } = this.dom.window;
        document.querySelectorAll('link[href]').forEach((link) => {
            if (link.href.endsWith('.css')) {
                const fileName = link.href.split('/').pop();
                link.href = `{{ landing.asset('css/${fileName}') }}`;
            }
        });
    }

    processScripts() {
        const { document } = this.dom.window;
        document.querySelectorAll('script[src]').forEach((script) => {
            const fileName = script.src.split('/').pop();
            script.src = `{{ landing.asset('js/${fileName}') }}`;
        });
    }

    processImages() {
        const { document } = this.dom.window;
        document.querySelectorAll('img[src]').forEach((img) => {
            const fileName = img.src.split('/').pop();
            img.src = `{{ landing.asset('images/${fileName}') }}`;
        });
    }

    processSvgImages() {
        const { document } = this.dom.window;
        document
            .querySelectorAll('image[href], image[xlink\\:href]')
            .forEach((svgImg) => {
                const href =
                    svgImg.getAttribute('href') ||
                    svgImg.getAttribute('xlink:href');
                if (!href) return;

                if (/^(https?:)?\/\//i.test(href) || href.startsWith('data:')) {
                    return;
                }

                const fileName = href.replace(/^\.\//, '').split('/').pop();
                const newPath = `{{ landing.asset('images/${fileName}') }}`;

                if (svgImg.hasAttribute('href')) {
                    svgImg.setAttribute('href', newPath);
                }
                if (svgImg.hasAttribute('xlink:href')) {
                    svgImg.setAttribute('xlink:href', newPath);
                }
            });
    }

    processSrcSet() {
        const { document } = this.dom.window;
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

    processBackgroundImages() {
        const { document } = this.dom.window;
        document
            .querySelectorAll('[style*="background-image"]')
            .forEach((element) => {
                let styleContent = element.getAttribute('style');
                styleContent = styleContent.replace(
                    /url\((['"]?)([^'")]+)\1\)/g,
                    (_match, _quote, url) => {
                        const fileName = url.split('/').pop();
                        return `url({{ landing.asset('images/${fileName}') }})`;
                    }
                );
                element.setAttribute('style', styleContent);
            });
    }

    processPreloadImages() {
        const { document } = this.dom.window;
        document
            .querySelectorAll('link[rel="preload"][as="image"][href]')
            .forEach((link) => {
                const filePath = link.getAttribute('href');
                const fileName = path.basename(filePath);
                link.setAttribute(
                    'href',
                    `{{ landing.asset('images/${fileName}') }}`
                );
            });
        console.log('Preload image links have been successfully processed.');
    }

    processVideos() {
        const { document } = this.dom.window;

        document.querySelectorAll('video[src]').forEach((video) => {
            const fileName = video.getAttribute('src').split('/').pop();
            video.setAttribute(
                'src',
                `{{ landing.asset('videos/${fileName}') }}`
            );
        });

        document.querySelectorAll('video source[src]').forEach((source) => {
            const fileName = source.getAttribute('src').split('/').pop();
            source.setAttribute(
                'src',
                `{{ landing.asset('videos/${fileName}') }}`
            );
        });

        console.log('Processed video elements.');
    }

    processAudios() {
        const { document } = this.dom.window;

        document.querySelectorAll('audio[src]').forEach((audio) => {
            const fileName = audio.getAttribute('src').split('/').pop();
            audio.setAttribute(
                'src',
                `{{ landing.asset('audios/${fileName}') }}`
            );
        });

        document.querySelectorAll('audio source[src]').forEach((source) => {
            const fileName = source.getAttribute('src').split('/').pop();
            source.setAttribute(
                'src',
                `{{ landing.asset('audios/${fileName}') }}`
            );
        });

        console.log('Processed audio elements.');
    }

    processFavicons() {
        const { document } = this.dom.window;
        document
            .querySelectorAll('link[rel*="icon"][href]')
            .forEach((link) => {
                const filePath = link.getAttribute('href');
                const fileName = filePath.split('/').pop();
                link.setAttribute(
                    'href',
                    `{{ landing.asset('images/${fileName}') }}`
                );
            });
        console.log('Favicon links have been successfully processed.');
    }

    processHead() {
        const { document } = this.dom.window;
        const title = document.querySelector('title');
        if (title) {
            title.textContent =
                "{{ landing.yieldArea('title', ['blocks/title']) }}";
        }

        const head = document.querySelector('head');
        if (head) {
            head.insertAdjacentHTML('beforeend', '{{ landing.head() }}');
        }
        console.log('The functions have been successfully added to the head section.');
    }

    processGeo() {
        const { document } = this.dom.window;
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
        console.log('Geo markup added (lang attribute on html, locale on body).');
    }

    addGtmIncludes() {
        const { document } = this.dom.window;
        const head = document.querySelector('head');
        const body = document.querySelector('body');

        if (head) {
            head.insertAdjacentHTML(
                'beforeend',
                `{% include '../../common/templates/gtm/gtm-head.twig' ignore missing %}`
            );
        }
        if (body) {
            body.insertAdjacentHTML(
                'afterbegin',
                `{% include '../../common/templates/gtm/gtm-body.twig' ignore missing %}`
            );
        }
        console.log('GTM includes have been added to head and body.');
    }
}

module.exports = HtmlProcessor;
