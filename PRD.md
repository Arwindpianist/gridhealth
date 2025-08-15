# **Product Requirements Document (PRD) — GridHealth**

## **1. Overview**

**GridHealth** is a system health monitoring solution designed for deployment across large organizations.
It consists of:

* **Agent** (desktop app/service) that collects system metrics and sends them to the cloud.
* **Admin Dashboard** to manage organizations, devices, and monitoring rules.
* **API Layer** for communication between agents and dashboard.
* **Shared Monorepo** structure to house all components in one GitHub project.

---

## **2. Goals**

* Allow **easy onboarding** for large organizations with hundreds/thousands of devices.
* Provide **customizable monitoring schedules** and alert configurations per organization.
* Support **automated mass deployment** via MSI/EXE installers with silent install parameters.
* Keep all code in **one monorepo** for easy maintenance and deployment.

---

## **3. Core Features**

### **3.1 Organization Management**

**For Admins (You / Platform Owner)**

* Create new organizations via dashboard.
* Assign:

  * Organization Name
  * Primary Contact Person
  * Contact Email
* System generates:

  * **Organization ID** (internal unique identifier)
  * **Organization Enrollment Token** (random, long, secure; can expire or rotate)
* View all organizations, their devices, and monitoring status.
* Revoke/refresh organization tokens.

---

### **3.2 Agent Enrollment Flow**

**Agent First Launch:**

1. Agent reads **Org Enrollment Token** from:

   * Silent install parameter (`ORGTOKEN=abc123`)
   * Config file in installer directory
   * Manual entry if user installs via GUI
2. Agent sends token + device fingerprint to API.
3. API validates token:

   * Assigns machine to Org.
   * Returns **OrgID + DeviceID + per-device auth key**.
4. Agent stores credentials locally (encrypted) for future API calls.

---

### **3.3 Mass Deployment Support**

* Windows **MSI** and **EXE** installers.
* Supports **silent installation** for IT admins:

  ```
  msiexec /i GridHealthAgent.msi ORGTOKEN=abc123 /quiet /norestart
  ```
* Compatible with:

  * Microsoft Intune
  * Group Policy (GPO)
  * SCCM / MECM
  * PDQ Deploy
* Installer packages will contain minimal pre-configuration; token provided during install.

---

### **3.4 Monitoring & Customization**

Per Organization:

* **Run Frequency**: e.g., every 5 min, hourly, daily.
* **Run Time**: exact hours for specific checks.
* **Data Points**:

  * CPU usage
  * Memory usage
  * Disk usage
  * Network stats
  * System uptime
  * Installed software list
* Admin can **enable/disable specific checks** for each organization.
* Alerts:

  * Email
  * Webhook (e.g., to Slack/MS Teams)
  * Dashboard notifications

---

### **3.5 Dashboard**

* **Multi-Tenant**: Each organization only sees its own data.
* **Super Admin View**: You can see all organizations and devices.
* Device list with:

  * Name
  * Status (Online / Offline)
  * Last check-in
  * Alerts triggered
* Organization settings:

  * Change token
  * Adjust monitoring frequency
  * Set alert rules

---

## **4. Architecture**

### **4.1 Monorepo Structure**

```
gridhealth/
  backend/        # API & Organization/Device logic
  dashboard/      # Web Admin interface (Next.js)
  agent/          # Desktop/Service agent
  shared/         # Shared libs, types, config
```

### **4.2 Tech Stack**

* **Backend**: Node.js (NestJS or Express) + PostgreSQL
* **Dashboard**: Next.js + Tailwind
* **Agent**: Electron (cross-platform) or Native Windows Service in C#/Go
* **Build & Deploy**: GitHub Actions
* **Auth**: JWT for agent API calls, session-based for dashboard
* **Deployment**: Docker containers for backend/dashboard

---

## **5. Onboarding Workflow**

**For You (Platform Owner)**

1. Create organization in dashboard.
2. Copy generated **enrollment token**.
3. Send token + installer link to client’s IT team.
4. Monitor dashboard to confirm devices check in.

**For Client IT Team**

1. Download installer (MSI/EXE).
2. Deploy across fleet using:

   * Intune, GPO, SCCM, PDQ Deploy, etc.
3. Done — devices auto-register to their org.

---

## **6. Security**

* **TLS** for all API communication.
* Tokens are single-use for enrollment only; after registration, device uses per-device key.
* Token revocation from dashboard.
* Device data encrypted in transit and at rest.

---

## **7. Roadmap**

**Phase 1** — MVP:

* Org creation
* Token-based enrollment
* Basic health metrics
* Dashboard for viewing data

**Phase 2**:

* Customizable monitoring schedules
* Alerts (email/webhook)
* Advanced deployment scripts
* Multi-platform agent support

**Phase 3**:

* Role-based access for organizations
* Integration with enterprise SSO (Azure AD, Okta)
* Historical reporting and analytics

---

This version is **enterprise-ready**, scales for large orgs, and uses a **single monorepo** for all code.
Your onboarding process is now essentially **"Create org → Send token → Client deploys silently"**, which is exactly how CrowdStrike, Datadog, and other enterprise endpoint monitors do it.

---