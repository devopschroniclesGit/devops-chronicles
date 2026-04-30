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
	    'courses/cloud-infra/module-1-vpc-design-principles',
	    'courses/cloud-infra/module-2-security-groups-iam',
	    'courses/cloud-infra/module-3-load-balancing-scaling',
	    'courses/cloud-infra/module-4-infrastructure-as-code-terraform',
	    'courses/cloud-infra/module-5-failure-simulation',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Projects',
      collapsed: false,
      items: [
        'projects/finpay/finpay-api',
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
