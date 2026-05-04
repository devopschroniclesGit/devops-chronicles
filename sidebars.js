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
        {
          type: 'category',
          label: 'FinPay API',
          collapsed: false,
          items: [
            'projects/finpay/finpay-api',
            {
              type: 'category',
              label: 'Monitoring',
              collapsed: false,
              items: [
                'projects/finpay/monitoring/monitoring-overview',
                'projects/finpay/monitoring/monitoring-instrumentation',
                'projects/finpay/monitoring/monitoring-alloy',
                'projects/finpay/monitoring/monitoring-dashboard',
                'projects/finpay/monitoring/monitoring-security',
                'projects/finpay/monitoring/monitoring-production',
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Resources',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Decision Frameworks',
          collapsed: false,
          items: [
            'resources/decision-frameworks/compute-ec2-lambda-ecs',
            'resources/decision-frameworks/storage-s3-ebs-efs',
            'resources/decision-frameworks/database-rds-dynamodb-aurora',
          ],
        },
        {
          type: 'category',
          label: 'Incident Patterns',
          collapsed: false,
          items: [
            'resources/incident-patterns/disk-full',
            'resources/incident-patterns/oom-killer',
            'resources/incident-patterns/iam-permission-errors',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
