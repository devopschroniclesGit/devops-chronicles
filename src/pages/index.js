import React, { useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const courses = [
  {
    title: 'DevOps Lab Engineering',
    href: '/devops-chronicles/docs/courses/devops-lab/module-1-virtualization-architecture',
    modules: 6,
    description:
      'Build a production-style home lab from scratch. Virtualisation, network segmentation, system hardening, storage engineering, and observability.',
    icon: '🖥️',
    level: 'Beginner → Intermediate',
  },
  {
    title: 'Cloud Infrastructure Engineering',
    href: '/devops-chronicles/docs/courses/cloud-infra/intro',
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
    href: '/devops-chronicles/docs/projects/case-studies/aws-elastic-beanstalk',
    description: 'End-to-end deployment of a Node.js app with auto scaling and zero-downtime deploys.',
    tag: 'Case Study',
  },
  {
    title: 'Streamlining Deployment with CodeDeploy',
    href: '/devops-chronicles/docs/projects/case-studies/aws-codedeploy',
    description: 'Blue/green deployments, lifecycle hooks, and automatic rollback on failure.',
    tag: 'Case Study',
  },
];

const resources = [
  { title: 'Lambda + S3 Trigger', href: '/devops-chronicles/docs/resources/aws/lambda-s3-trigger', tag: 'AWS' },
  { title: 'Understanding Database Types', href: '/devops-chronicles/docs/resources/databases/understanding-database-types', tag: 'Architecture' },
  { title: 'CI/CD Pipeline from Scratch', href: '/devops-chronicles/docs/resources/cicd/cicd-pipeline-from-scratch', tag: 'CI/CD' },
  { title: 'Microservices at Scale', href: '/devops-chronicles/docs/resources/containers/microservices-scalable-systems', tag: 'Containers' },
];

// Hook: adds .visible class when element enters viewport
function useScrollReveal(selector) {
  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target); // animate once only
          }
        });
      },
      { threshold: 0.12 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [selector]);
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  // Trigger scroll reveal for cards and sections
  useScrollReveal(`.${styles.fadeUp}`);

  return (
    <Layout
      title="Home"
      description="Production-grade DevOps engineering — Linux systems, cloud infrastructure, automation, and CI/CD documented from real constraints.">

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={`${styles.heroBadge} ${styles.heroAnimate1}`}>
            DevOps Engineering
          </div>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroAnimate2}>Real Systems.</span>
            <span className={styles.heroAnimate3}>Real Constraints.</span>
            <span className={styles.heroAnimate4}>Real Engineering.</span>
          </h1>
          <p className={`${styles.heroSub} ${styles.heroAnimate5}`}>
            DevOps Chronicles documents production infrastructure — Linux systems
            administration, cloud architecture, automation, and CI/CD pipelines built
            from operating real systems under real pressure.
          </p>
          <div className={`${styles.heroCta} ${styles.heroAnimate6}`}>
            <Link className={styles.btnPrimary} to="/docs/courses/devops-lab/module-1-virtualization-architecture">
              Start with the Lab Course
            </Link>
            <Link className={styles.btnOutline} to="/docs/about">
              About this site
            </Link>
          </div>
        </div>

        {/* Terminal */}
        <div className={`${styles.terminal} ${styles.heroAnimate5}`}>
          <div className={styles.terminalBar}>
            <span className={styles.dot} style={{ background: '#ff5f57' }} />
            <span className={styles.dot} style={{ background: '#febc2e' }} />
            <span className={styles.dot} style={{ background: '#28c840' }} />
            <span className={styles.terminalTitle}>devops-chronicles ~ bash</span>
          </div>
          <div className={styles.terminalBody}>
            <div><span className={styles.prompt}>$</span> git clone devops-chronicles</div>
            <div className={styles.termOut}>Cloning into 'devops-chronicles'...</div>
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
          <div className={`${styles.sectionLabel} ${styles.fadeUp}`}>Courses</div>
          <h2 className={`${styles.sectionTitle} ${styles.fadeUp}`}>Learn from the ground up</h2>
          <div className={styles.courseGrid}>
            {courses.map((c, i) => (
              <Link
                key={c.href}
                to={c.href}
                className={`${styles.courseCard} ${styles.fadeUp}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
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
      <div className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={`${styles.sectionLabel} ${styles.fadeUp}`}>Projects</div>
          <h2 className={`${styles.sectionTitle} ${styles.fadeUp}`}>Production case studies</h2>
          <div className={styles.projectGrid}>
            {projects.map((p, i) => (
              <Link
                key={p.href}
                to={p.href}
                className={`${styles.projectCard} ${styles.fadeUp}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
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
          <div className={`${styles.sectionLabel} ${styles.fadeUp}`}>Resources</div>
          <h2 className={`${styles.sectionTitle} ${styles.fadeUp}`}>Reference guides</h2>
          <div className={styles.resourceList}>
            {resources.map((r, i) => (
              <Link
                key={r.href}
                to={r.href}
                className={`${styles.resourceRow} ${styles.fadeUp}`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <span className={styles.resourceTag}>{r.tag}</span>
                <span className={styles.resourceTitle}>{r.title}</span>
                <span className={styles.resourceArrow}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom strip ── */}
      <div className={`${styles.strip} ${styles.fadeUp}`}>
        Every topic is approached from a production mindset — not a certification checklist.
      </div>

    </Layout>
  );
}
