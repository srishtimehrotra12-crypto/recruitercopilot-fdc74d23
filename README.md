# Employee Onboarding — SOP & Compliance Tracker

A process design and operational tracking project demonstrating HR Operations capability: a Standard Operating Procedure for new-hire onboarding, paired with an Excel tracker that operationalizes it — flagging overdue compliance items automatically.

## What's inside

- **Onboarding_SOP.docx / .pdf** — a Standard Operating Procedure covering the full onboarding lifecycle (pre-joining through Month 1), including role responsibilities (Recruiter, HR Ops, IT, Reporting Manager), a statutory documentation checklist (PAN/Aadhaar, PF, ESIC), and an escalation policy for compliance delays.
- **Onboarding_Compliance_Tracker.xlsx** — an 18-employee onboarding tracker with:
  - Live formulas tracking each employee's progress across 4 onboarding stages (documentation, Day 1, PF/ESIC registration, Month 1 check-in)
  - An automatic **Days Since Joining** calculation (`=TODAY()-JoiningDate`) and a **Status** formula that flags anyone overdue (`=IF(Completion=100,"Complete",IF(AND(DaysSinceJoining>30,Completion<100),"OVERDUE","In Progress"))`)
  - Conditional formatting — overdue rows highlight red, completed rows highlight green, with no manual review needed
  - A Dashboard sheet with completion metrics and a status-breakdown pie chart, all formula-driven

## Why this project

I don't have direct HR Operations work experience yet, so I built this to demonstrate the underlying skill directly: writing a compliant, role-clear onboarding process, then building the tracking tool that keeps that process honest and audit-ready — rather than just claiming familiarity with onboarding and compliance on a resume.

## Skills demonstrated

Process design (SOP writing) · Statutory compliance awareness (PF/ESIC/documentation) · `TODAY()` date logic · Nested `IF` conditions · Conditional formatting · Dashboard/chart building from live formulas

## About

Built by Srishti Mehrotra — Talent Acquisition Specialist exploring AI-augmented recruiting, people analytics, and HR operations. [LinkedIn](https://linkedin.com/in/srishtimehrotra)
