// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Devopschronicles',
  tagline: 'Production-grade DevOps engineering, documented from real systems.',
  favicon: 'img/favicon.ico',

  url: 'https://devopschroniclesgit.github.io',
  baseUrl: '/devops-chronicles',

  organizationName: 'devopschroniclesgit',
  projectName: 'devops-chronicles',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/devopschroniclesgit',
        },
        blog: false, // Not using blog — disable to keep build clean
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },

      image: 'img/docusaurus-social-card.jpg',

      navbar: {
        title: 'DevOps chronicles',
        logo: {
          alt: 'DevOps Chronicles',
          src: 'img/logo-light.png',
          srcDark: 'img/logo-dark.png',
        },
        items: [
          // Each item now links to the FIRST PAGE of that section.
          // The sidebar auto-loads based on which doc is active —
          // no need to specify sidebarId at all.
          {
            to: '/docs/about',
            label: 'About',
            position: 'left',
            activeBasePath: 'docs/about',
          },
          {
            to: '/docs/courses/devops-lab/module-1-virtualization-architecture',
            label: 'Courses',
            position: 'left',
            activeBaseRegex: 'docs/courses/',
          },
          {
            to: '/docs/projects/case-studies/index',
            label: 'Projects',
            position: 'left',
            activeBaseRegex: 'docs/projects/',
          },
          {
            to: '/docs/resources/aws/lambda-s3-trigger',
            label: 'Resources',
            position: 'left',
            activeBaseRegex: 'docs/resources/',
          },
          {
            href: 'https://github.com/devopschroniclesgit',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },

      footer: {
        style: 'dark',
        links: [
          {
            title: 'Courses',
            items: [
              {
                label: 'DevOps Lab Engineering',
                to: '/docs/courses/devops-lab/module-1-virtualization-architecture',
              },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/devopschroniclesgit',
              },
              {
                label: 'About',
                to: '/docs/about',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} DevOps Chronicles — Real Systems. Real Engineering.`,
      },

      prism: {
        theme: prismThemes.oneDark,
        darkTheme: prismThemes.oneDark,
        additionalLanguages: ['bash', 'yaml', 'hcl', 'docker', 'nginx'],
      },
    }),
};

export default config;
