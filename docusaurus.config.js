// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Devopschronicles',
  tagline: 'Production-grade DevOps engineering, documented from real systems.',
  favicon: 'img/favicon.ico',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  url: 'https://www.devopschronicles.com',
  baseUrl: '/',

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
        blog: false,
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

      image: 'img/social-card.jpg',

      navbar: {
        title: 'DevOps chronicles',
        logo: {
          alt: 'DevOps Chronicles',
          src: 'img/logo-light.png',
          srcDark: 'img/logo-dark.png',
        },
        items: [
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
            to: '/docs/projects/finpay/finpay-api',
            label: 'Projects',
            position: 'left',
            activeBaseRegex: 'docs/projects/',
          },
          {
            to: '/docs/resources/decision-frameworks/compute-ec2-lambda-ecs',
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
                label: 'Cloud Infrastructure',
                to: '/docs/courses/cloud-infra/intro',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'About',
                to: '/docs/about',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/devopschroniclesgit',
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
