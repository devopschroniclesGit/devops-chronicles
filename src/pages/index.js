import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const courses = [
  {
    title: 'DevOps Lab Engineering',
    href: '/docs/courses/devops-lab/intro',
    modules: 6,
    description:
      'Build a production-style home lab from scratch. Virtualisation, network segmentation, system hardening, storage engineering, and observability.',
    icon: '🖥️',
    level: 'Beginner → Intermediate',
  },
  {
    title: 'Cloud Infrastructure Engineering',
    href: '/docs/courses/cloud-infra/intro',
    modules: 5,
    description:
      'Design and operate production AWS infrastructure. VPC design, IAM strategy, load balancing, Terraform, and failure simulation.',
    icon: '☁️',
    level: 'Intermediate',
  },
];

const projects = [
  {
    title: 'AWS Elastic Beanstalk Deployment',
    href: '/docs/projects/case-studies/aws-elastic-beanstalk',
    description: 'End-to-end deployment of a Node.js app with auto scaling and zero-downtime deploys.',
    tag: 'Case Study',
  },
  {
    title: 'Streamlining Deployment with CodeDeploy',
    href: '/docs/projects/case-studies/aws-codedeploy',
    description: 'Blue/green deployments, lifecycle hooks, and automatic rollback on failure.',
    tag: 'Case Study',
  },
];

const resources = [
  { title: 'Lambda + S3 Trigger', href: '/docs/resources/aws/lambda-s3-trigger', tag: 'AWS' },
  { title: 'Understanding Database Types', href: '/docs/resources/databases/understanding-database-types', tag: 'Architecture' },
  { title: 'CI/CD Pipeline from Scratch', href: '/docs/resources/cicd/cicd-pipeline-from-scratch', tag: 'CI/CD' },
  { title: 'Microservices at Scale', href: '/docs/resources/containers/microservices-scalable-systems', tag: 'Containers' },
];

export default function Home() {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title="Home"
      description="Production-grade DevOps engineering — Linux systems, cloud infrastructure, automation, and CI/CD documented from real constraints.">

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>DevOps Engineering</div>
          <h1 className={styles.heroTitle}>
            Real Systems.<br />Real Constraints.<br />Real Engineering.
          </h1>
          <p className={styles.heroSub}>
            DevOps Chronicles documents production infrastructure — Linux systems
            administration, cloud architecture, automation, and CI/CD pipelines built
            from operating real systems under real pressure.
          </p>
          <div className={styles.heroCta}>
            <Link className={styles.btnPrimary} to="/docs/courses/devops-lab/intro">
              Start with the Lab Course
            </Link>
            <Link className={styles.btnOutline} to="/docs/about">
              About this site
            </Link>
          </div>
        </div>

        {/* Terminal window decoration */}
        <div className={styles.terminal}>
          <div className={styles.terminalBar}>
            <span className={styles.dot} style={{background:'#ff5f57'}}/>
            <span className={styles.dot} style={{background:'#febc2e'}}/>
            <span className={styles.dot} style={{background:'#28c840'}}/>
            <span className={styles.terminalTitle}>devops-chronicles ~ bash</span>
          </div>
          <div className={styles.terminalBody}>
            <div><span className={styles.prompt}>$</span> git clone devops-chronicles</div>
            <div><span className={styles.prompt}>$</span> cd courses/devops-lab</div>
            <div><span className={styles.prompt}>$</span> cat module-1-virtualization.md</div>
            <div className={styles.comment}># Engineering the Foundation</div>
            <div className={styles.comment}># Before Installing Tools</div>
            <div><span className={styles.prompt}>$</span> <span className={styles.cursor}>█</span></div>
          </div>
        </div>
      </div>

      {/* ── Courses ── */}
      <div className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Courses</div>
          <h2 className={styles.sectionTitle}>Learn from the ground up</h2>
          <div className={styles.courseGrid}>
            {courses.map((c) => (
              <Link key={c.href} to={c.href} className={styles.courseCard}>
                <div className={styles.courseIcon}>{c.icon}</div>
                <div className={styles.courseContent}>
                  <div className={styles.courseMeta}>
                    <span className={styles.courseModules}>{c.modules} modules</span>
                    <span className={styles.courseLevel}>{c.level}</span>
                  </div>
                  <h3 className={styles.courseTitle}>{c.title}</h3>
                  <p className={styles.courseDesc}>{c.description}</p>
                </div>
                <div className={styles.courseArrow}>→</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Projects ── */}
      <div className={styles.section} style={{background:'var(--ifm-color-emphasis-100)'}}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Projects</div>
          <h2 className={styles.sectionTitle}>Production case studies</h2>
          <div className={styles.projectGrid}>
            {projects.map((p) => (
              <Link key={p.href} to={p.href} className={styles.projectCard}>
                <span className={styles.projectTag}>{p.tag}</span>
                <h3 className={styles.projectTitle}>{p.title}</h3>
                <p className={styles.projectDesc}>{p.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Resources ── */}
      <div className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Resources</div>
          <h2 className={styles.sectionTitle}>Reference guides</h2>
          <div className={styles.resourceList}>
            {resources.map((r) => (
              <Link key={r.href} to={r.href} className={styles.resourceRow}>
                <span className={styles.resourceTag}>{r.tag}</span>
                <span className={styles.resourceTitle}>{r.title}</span>
                <span className={styles.resourceArrow}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom strip ── */}
      <div className={styles.strip}>
        Every topic is approached from a production mindset — not a certification checklist.
      </div>

    </Layout>
  );
}
