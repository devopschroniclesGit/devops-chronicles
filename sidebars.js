const sidebars = {
  tutorialSidebar: [
    'about',
    {
      type: 'category',
      label: 'Courses',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'DevOps Lab Engineering',
          items: [
          //  'courses/devops-lab/intro',
	    'courses/devops-lab/module-1-virtualization-architecture',
            'courses/devops-lab/module-2-network-segmentation',
    	    'courses/devops-lab/module-3-system-hardening',
            'courses/devops-lab/module-4-storage-engineering',
            'courses/devops-lab/module-5-multi-node-lab-design',
            'courses/devops-lab/module-6-observability-foundations',
          ],
        },
        {
          type: 'category',
          label: 'Cloud Infrastructure',
          items: [
            'courses/cloud-infra/intro',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Projects',
      collapsed: false,
      items: [
        'projects/case-studies/index',
        'projects/security/index',
        'projects/monitoring/index',
      ],
    },
    {
      type: 'category',
      label: 'Resources',
      collapsed: false,
      items: [
        'resources/aws/lambda-s3-trigger',
        'resources/databases/understanding-database-types',
        'resources/cicd/cicd-pipeline-from-scratch',
        'resources/containers/dockerizing-nodejs',
      ],
    },
  ],
};

export default sidebars;
