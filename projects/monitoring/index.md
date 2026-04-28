---
title: Monitoring & Logging
description: Building observable systems with CloudWatch, Prometheus, Grafana, and centralised logging.
---

# Monitoring & Logging

You cannot operate a system you cannot observe. This section covers building observability into infrastructure from the ground up — metrics, logs, and alerting that tells you something is wrong before your users do.

---

## Setting Up CloudWatch for Production AWS Workloads

**Problem:** EC2 instances were running with only the default CloudWatch metrics — CPU, network, disk I/O at the hypervisor level. There was no memory usage, no application logs, no alerting. The first sign of a problem was a user complaint.

**Goal:** Full visibility into instance health, application logs centralised in CloudWatch Logs, and automated alerting before problems impact users.

### Step 1 — Install the CloudWatch Agent

The default EC2 metrics do not include memory usage or disk space — these require the CloudWatch agent running inside the instance.

```bash
# Amazon Linux 2 / RHEL
sudo yum install amazon-cloudwatch-agent -y

# Ubuntu / Debian
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

### Step 2 — Configure the Agent

Create the agent config at `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`:

```json title="amazon-cloudwatch-agent.json"
{
  "metrics": {
    "namespace": "MyApp/Production",
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/", "/var"],
        "metrics_collection_interval": 60
      },
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60,
        "totalcpu": true
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/application.log",
            "log_group_name": "/myapp/production/application",
            "log_stream_name": "{instance_id}",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/myapp/production/nginx",
            "log_stream_name": "{instance_id}-nginx-error"
          }
        ]
      }
    }
  }
}
```

```bash
# Start the agent with your config
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### Step 3 — Create Alarms

Create alarms that fire before the situation becomes critical. Alerting at 95% memory when the system starts thrashing at 90% is too late.

```bash
# Alert when memory exceeds 80%
aws cloudwatch put-metric-alarm \
  --alarm-name "production-high-memory" \
  --alarm-description "Memory usage above 80% for 5 minutes" \
  --metric-name mem_used_percent \
  --namespace MyApp/Production \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts-topic \
  --ok-actions arn:aws:sns:us-east-1:123456789:alerts-topic

# Alert when disk exceeds 85%
aws cloudwatch put-metric-alarm \
  --alarm-name "production-high-disk" \
  --alarm-description "Disk usage above 85%" \
  --metric-name disk_used_percent \
  --namespace MyApp/Production \
  --dimensions Name=path,Value=/ \
  --statistic Average \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts-topic
```

### Step 4 — Log Insights Queries

CloudWatch Log Insights lets you query your logs like a database. Save these queries — you will use them constantly.

```bash
# Find all errors in the last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50

# Count errors by type over time
fields @timestamp, @message
| filter @message like /ERROR/
| parse @message "ERROR * -" as error_type
| stats count() by error_type, bin(5m)

# Find slow requests (over 2 seconds)
fields @timestamp, @message
| filter @message like /response_time/
| parse @message "response_time=*ms" as response_ms
| filter response_ms > 2000
| sort response_ms desc
```

### What Went Wrong

- **Agent stopped after instance reboot** — forgot to enable the service. Added `sudo systemctl enable amazon-cloudwatch-agent` to the provisioning script.
- **Log group costs spiralled** — application was logging every HTTP request including health checks, generating millions of log events per day. Added filtering to exclude `/health` endpoint logs.
- **Alarm flapping** — CPU alarm fired and recovered every few minutes during normal operation. Increased `evaluation-periods` from 1 to 3, requiring the threshold to be breached for 15 consecutive minutes before alerting.

### Lessons Learned

- Set alarms at 70-80% of your threshold — not at the threshold itself. By the time you hit 95% memory, you are already in an incident.
- Exclude health check endpoints from application logs — they generate enormous volume with zero diagnostic value.
- Always configure an OK action alongside your alarm action — you need to know when a problem resolves, not just when it starts.
- Log retention costs money. Set a retention policy on every log group — 30 days for application logs, 90 days for security/audit logs.

---

## Prometheus and Grafana on a Linux Server

For environments not on AWS, Prometheus and Grafana provide the same observability capability on any Linux server.

### Install Prometheus

```bash
# Create a dedicated user — never run Prometheus as root
sudo useradd --no-create-home --shell /bin/false prometheus

# Download and install
wget https://github.com/prometheus/prometheus/releases/download/v2.47.0/prometheus-2.47.0.linux-amd64.tar.gz
tar xvf prometheus-2.47.0.linux-amd64.tar.gz
sudo cp prometheus-2.47.0.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-2.47.0.linux-amd64/promtool /usr/local/bin/
```

```yaml title="/etc/prometheus/prometheus.yml"
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']  # node_exporter

  - job_name: 'myapp'
    static_configs:
      - targets: ['localhost:8080']  # your application metrics endpoint
    metrics_path: '/metrics'
```

### Install Node Exporter

Node exporter exposes Linux system metrics — CPU, memory, disk, network — in Prometheus format.

```bash
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvf node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

Once running, navigate to `http://your-server-ip:3000` for Grafana and import dashboard ID **1860** — the Node Exporter Full dashboard. In under 5 minutes you have full visibility into every system metric.
