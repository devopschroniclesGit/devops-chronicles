---
title: Module 3 – System Hardening
sidebar_label: Module 3 – System Hardening
description: Security is configuration discipline. Harden your base Linux system before installing any services or opening any ports.
tags: [devops-lab, linux, security, hardening, beginner]
sidebar_position: 3
---

# Module 3 – System Hardening

## Security Is Configuration Discipline

A default Linux installation is not hardened. It is functional.

Functional systems can still be:

- Overexposed
- Misconfigured
- Privilege-escalation vulnerable
- Logically insecure

Before installing Docker. Before deploying services. Before opening ports — you harden
the base system.

## 1. Hardening Philosophy

Hardening is not paranoia. It is reducing:

- Attack surface
- Unnecessary services
- Privilege scope
- Configuration ambiguity

Every exposed service is a liability. Every open port is a potential failure point.

The goal is not zero risk. The goal is deliberate, understood risk.

## 2. Service Exposure Analysis

Start by understanding what your system is currently running.

List all active services:

```bash title="Terminal"
sudo systemctl list-units --type=service --state=running
```

For every service, ask:

- Do I need this?
- What port does it use?
- Who can access it?

List all open ports:

```bash title="Terminal"
sudo ss -tulnp
```

:::warning
If you cannot explain why a port is open, close it. Unknown open ports are not a
mystery — they are a misconfiguration.
:::

## 3. SSH Hardening

SSH is the primary attack vector in most Linux environments. Default SSH configuration
is too permissive for any system that can be reached from a network.

Open the SSH configuration file:

```bash title="Terminal"
sudo nano /etc/ssh/sshd_config
```

Make these changes:

```bash title="/etc/ssh/sshd_config"
# Disable root login — never SSH directly as root
PermitRootLogin no

# Disable password authentication after SSH keys are configured
PasswordAuthentication no

# Restrict which users can SSH in
AllowUsers youruser

# Reduce the login grace period
LoginGraceTime 30

# Disable empty passwords
PermitEmptyPasswords no
```

Restart SSH to apply changes:

```bash title="Terminal"
sudo systemctl restart sshd
```

:::danger Before restarting SSH
Always open a second terminal session before testing SSH changes. If your configuration
breaks SSH access, the second session keeps you connected. Restarting SSH on a single
session without a backup connection risks being locked out entirely.
:::

## 4. Firewall Configuration (firewalld)

Enterprise Linux systems use `firewalld` by default. It manages rules using zones —
each zone represents a trust level for network connections.

Check status:

```bash title="Terminal"
sudo systemctl status firewalld
```

If not running:

```bash title="Terminal"
sudo systemctl enable --now firewalld
```

Inspect your current configuration:

```bash title="Terminal"
# See which zones are active and which interfaces are in them
sudo firewall-cmd --get-active-zones

# List all rules in the active zone
sudo firewall-cmd --list-all
```

Allow only the services you need:

```bash title="Terminal"
# Allow SSH permanently
sudo firewall-cmd --add-service=ssh --permanent

# Allow HTTP if running a web server
sudo firewall-cmd --add-service=http --permanent

# Apply changes
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

:::warning
Never leave services exposed "temporarily." Temporary configurations become permanent
through neglect. Every rule must have a reason — document it.
:::

## 5. User and Privilege Discipline

Never operate daily as root. Root has unrestricted access to everything — a mistake
as root is unrecoverable without intervention.

Create a dedicated privileged user:

```bash title="Terminal"
sudo useradd -m devopsuser
sudo passwd devopsuser
sudo usermod -aG wheel devopsuser
```

Verify sudo access works before logging out of root:

```bash title="Terminal"
su - devopsuser
sudo whoami    # should return: root
```

**Principle:** Least privilege always. Only escalate when the task requires it. Operate
as your non-root user for everything else.

## 6. Disabling Unnecessary Services

Find services you do not need and disable them:

```bash title="Terminal"
sudo systemctl disable --now service-name
```

Common services to disable in lab systems:

| Service | Why disable |
|---|---|
| `cups` | Printing — not needed on a server |
| `avahi-daemon` | mDNS discovery — not needed in a lab |
| `bluetooth` | No Bluetooth hardware in a VM |
| `postfix` | Mail server — disable if not sending mail |

Every unnecessary service increases boot time, memory usage, and attack surface.

## 7. Log Monitoring Fundamentals

Logs are your visibility layer. If you do not read logs, you are operating blind.

Primary log locations:

```bash title="Terminal"
# Full system journal
sudo journalctl

# Last 100 lines
sudo journalctl -n 100

# Specific service logs
sudo journalctl -u sshd

# Follow logs in real time
sudo journalctl -f

# Logs since last boot
sudo journalctl -b
```

Look for:

- Failed login attempts in `/var/log/secure`
- Service crashes and restarts
- Kernel messages about hardware or disk errors
- Unexpected process starts

If you do not monitor logs, you do not control the system.

## 8. File Permission Awareness

Critical files must have correct permissions. Incorrect permissions are a common
privilege escalation path.

Check key files:

```bash title="Terminal"
# /etc/shadow stores password hashes — should only be readable by root
ls -l /etc/shadow
# Expected: ---------- 1 root root (or 640 root shadow)

# SSH private keys must not be group or world readable
ls -l ~/.ssh/id_rsa
# Expected: -rw------- 1 youruser youruser
```

Understanding permission notation:

```
-rw-r--r--
│├┤├┤├┤
│ │  │  └── Others: read only
│ │  └───── Group: read only
│ └──────── Owner: read + write
└────────── File type (- = regular file)
```

:::danger
Never grant `777` permissions out of convenience. `chmod 777` means anyone on the
system can read, write, and execute the file. Convenience creates compromise.
:::

## 9. Automatic Updates — Controlled Approach

Automatic updates improve security posture but reduce operational control. You need
to understand the trade-off before enabling them.

**Option 1 — Manual updates with discipline:**

```bash title="Terminal"
# Run updates on a defined schedule (weekly minimum)
sudo dnf update -y
```

**Option 2 — Automatic security updates only:**

```bash title="Terminal"
sudo dnf install dnf-automatic -y
sudo nano /etc/dnf/automatic.conf
# Set: apply_updates = yes
# Set: upgrade_type = security
sudo systemctl enable --now dnf-automatic.timer
```

Security patches only — not feature updates. Feature updates should be tested before
applying to a running system.

## 10. Hardening Checklist

Before moving to Module 4, confirm all items:

- [ ] Root SSH login disabled (`PermitRootLogin no`)
- [ ] Password authentication disabled (after SSH keys configured)
- [ ] Firewall enabled and active
- [ ] Only required ports open — verified with `sudo ss -tulnp`
- [ ] Non-root sudo user created and tested
- [ ] Unnecessary services disabled
- [ ] Logs reviewed — no unexpected entries
- [ ] Snapshot taken: `03-hardened-base`

Take the snapshot:

```bash title="VirtualBox — take this snapshot now"
# Snapshot name: 03-hardened-base
```

Infrastructure must be versioned after major configuration changes.

## 11. Lab Assignment

**Harden your primary node:**

1. Configure SSH restrictions as documented above
2. Enable firewall and close unnecessary ports
3. Create a dedicated sudo user
4. Disable at least two unnecessary services

**Then attempt to break your own system:**

- Try SSH as root — confirm it is denied
- Try password login if keys are configured — confirm it is denied
- Attempt connection from a non-allowed user

**Document:**

- What changed from the default configuration
- What would happen if the firewall was disabled
- What would happen if root login was re-enabled

Hardening is validated through testing. If you have not attempted to break your own
configuration, you have not validated it.

## 12. Production Reflection

Consider these questions before moving on:

- What happens if SSH is exposed publicly without hardening? (Check `fail2ban` logs
  on any internet-exposed SSH port — brute force starts within minutes)
- What happens if firewall rules are too permissive?
- How do the SSH hardening steps here map to AWS Security Group rules?
- What does "defense in depth" mean when applied to a single Linux server?

Security is layered. Network segmentation + firewall + SSH discipline + least privilege.
Remove one layer and risk increases. Remove two layers and a single mistake becomes
a compromise.

## Module Completion Criteria

You are ready for Module 4 when:

- [ ] You understand which ports are open and why each one is open
- [ ] You can explain your firewall configuration rule by rule
- [ ] You operate exclusively as a non-root user
- [ ] You have a hardened snapshot saved as `03-hardened-base`
- [ ] You have tested your hardening by attempting to violate it

---

**Next:** [Module 4 – Storage Engineering](./module-4-storage-engineering)
