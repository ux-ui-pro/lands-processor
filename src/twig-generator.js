const fs = require('fs').promises;
const path = require('path');

class TwigGenerator {
    constructor(dom, projectDistDir) {
        this.dom = dom;
        this.projectDistDir = projectDistDir;
    }

    async saveMainTwig() {
        const updatedHtml = this.dom.serialize();
        const mainTwigPath = path.join(this.projectDistDir, 'main.twig');
        await fs.writeFile(mainTwigPath, updatedHtml);
        console.log('The main.twig file has been successfully created.');
    }

    async organizeMainTwig() {
        const layoutsDir = path.join(this.projectDistDir, 'layouts');
        const currentMainTwigPath = path.join(this.projectDistDir, 'main.twig');
        const newMainTwigPath = path.join(layoutsDir, 'main.twig');

        await fs.mkdir(layoutsDir, { recursive: true });
        await fs.rename(currentMainTwigPath, newMainTwigPath);

        console.log('The main.twig file has been successfully moved to the layouts directory.');
    }

    async createFileStructure() {
        const blocksDir = path.join(this.projectDistDir, 'blocks', 'title');
        const configPath = path.join(this.projectDistDir, 'config.yml');
        const infoPath = path.join(blocksDir, 'info.yml');
        const templatePath = path.join(blocksDir, 'template.twig');

        await fs.mkdir(blocksDir, { recursive: true });

        const projectName = path.basename(this.projectDistDir);

        const infoContent = `name: 'Title'
default_content:
 - '${projectName}'
`;
        await fs.writeFile(infoPath, infoContent, 'utf8');

        const templateContent = `{{ block.content() }}
`;
        await fs.writeFile(templatePath, templateContent, 'utf8');

        const configContent = `name: '${projectName}'
layouts:
  main: 'Основной'
areas:
  title:
    - 'blocks/title'
`;
        await fs.writeFile(configPath, configContent, 'utf8');

        console.log('File structure has been successfully created.');
    }
}

module.exports = TwigGenerator;
