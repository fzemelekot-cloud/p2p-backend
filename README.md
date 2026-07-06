# P2P Trading Network Backend Engine

An enterprise-grade, highly optimized NestJS and TypeORM backend engine powering decentralized Peer-to-Peer (P2P) fiat-crypto trading operations. This application orchestrates order matching, automated escrow controls, KYC workflows, live blockchain network deposit monitoring, and secure withdrawal infrastructure.

---

## 🛠️ Tech Stack & Key Modules

* **Framework:** NestJS (Node.js v20+) with TypeScript
* **Database:** PostgreSQL 16+ managed via TypeORM
* **Health & Resiliency:** NestJS Terminus Engine
* **Blockchain Tracker:** Multi-threaded internal block height synchronization workers

---

## 🚀 Environment Variables

Create a secure configuration profile inside `p2p-backend/.env`. Refer to the structural schema breakdown below:

| Key Variable | Format Type | Operational Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://user:pass@host:port/db` | Core relational data layer link string. |
| `JWT_SECRET` | Cryptographic String | Keys signed for secure session/bearer authorization tokens. |
| `PORT` | Number (Default: `3000`) | Network bind access interface gateway. |

---

## 📦 Installation & Setup

### 1. Provision Source Context
Clone the repository and jump directly into the application root folder:
```bash
cd "P2P WORK PLACE/p2p-backend"