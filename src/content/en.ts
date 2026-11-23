import type { SiteCopy } from "./types";

export const en = {
  meta: {
    title: "Erfan Alikhani, full-stack developer (.NET & React)",
    description: "Full-stack developer in Tehran since 2021: ASP.NET Core, React and Next.js, event-driven microservices, and geospatial, financial and manufacturing software.",
    siteName: "Erfan Alikhani",
  },
  nav: {
    label: "Sections",
    skip: "Skip to content",
    sections: {
      about: "About",
      experience: "Experience",
      skills: "Skills",
      projects: "Projects",
      contact: "Contact",
    },
  },
  language: { switchTo: "فارسی", switchLabel: "Read this page in Persian" },
  theme: { label: "Night map" },
  hero: {
    name: "Erfan Alikhani",
    role: "Full-stack developer, [[.NET]] & [[React]]",
    lead: "I build the services and interfaces behind data-heavy products, from satellite-based land analytics to factory production lines and financial institutions. I aim for software that stays reliable and easy to change.",
    location: "Tehran, Iran",
    coordinates: "35.7575° N, 51.4100° E",
    primaryAction: "Get in touch",
    cvAction: "Download CV (PDF)",
    mapTitle: "Career route, 2021 to today",
    mapLegend: { fullTime: "Full-time", partTime: "Part-time, in parallel" },
    mapDescription:
      "An illustrated contour map where left to right is time, from 2021 to today. The main route climbs through full-time roles: United Techies 2021–2023, Nadin Soft 2023–2025 and Sisootech since 2025. Two separate side trails show part-time roles held in parallel, each ending where the role ended: Dinamotor 2023–2026 and PantryLab 2024–2026.",
  },
  about: {
    title: "About",
    paragraphs: [
      "I started in 2021 as a frontend developer at United Techies, building responsive interfaces with [[React]], [[Next.js]] and [[TypeScript]]. At Nadin Soft I grew from junior to mid-level frontend developer, then moved into full-stack work with [[.NET]] and backend architecture, and the backend became the center of what I do.",
      "Today I design microservices with [[ASP.NET Core]] and [[C#]], using event-driven architecture, [[CQRS]] and API gateways, with [[Kafka]], [[Redis]], [[Elasticsearch]] and [[SQL Server]] for messaging, caching, search and storage. On the frontend I work with [[React]], [[Next.js]] and [[Vue]], and I have shipped cross-platform mobile apps with [[React Native]] and [[Expo]].",
      "Alongside my full-time roles I led front-end work part-time at Dinamotor, on software that runs factory production lines, and built PantryLab's web and mobile apps remotely for a team in Amsterdam. Across GIS, finance, manufacturing and consumer apps, I aim for maintainable code, reliable systems and close collaboration from design through deployment.",
    ],
    facts: [
      { label: "Based in", value: "Tehran, Iran" },
      { label: "Currently", value: "Full-stack engineer at [[Sisootech]]" },
      { label: "Working since", value: "2021" },
      { label: "Education", value: "Bachelor's in Computer Engineering" },
    ],
    languages: {
      label: "Languages",
      names: { fa: "Persian", en: "English" },
      levels: { native: "native", intermediate: "intermediate" },
    },
  },
  availability: {
    label: "Availability",
    value: "Open to remote roles, project-based work and freelance",
  },
  experience: {
    title: "Experience",
    intro: "Five roles, some in parallel, in one direction: from interfaces to the systems underneath them.",
    stackLabel: "Stack",
    stepsLabel: "Roles at Nadin Soft",
    employment: { "full-time": "Full-time", "part-time": "Part-time" },
    onLinkedIn: "on LinkedIn",
    jobs: {
      sisootech: {
        role: "Full-stack engineer",
        location: "Tehran, Iran",
        highlights: [
          "Develop and maintain GeoInsight, an enterprise GIS and geospatial analytics platform for land assessment and environmental monitoring.",
          "Design and build backend microservices with [[.NET]], [[Elasticsearch]], [[Redis]], [[Kafka]] and [[SQL Server]].",
          "Implement advanced search and satellite-derived environmental indicators, including NDVI, land surface temperature, vegetation health and climate indicators.",
          "Apply event-driven architecture and distributed-systems principles for availability, reliability and data consistency.",
        ],
      },
      pantrylab: {
        role: "[[React Native]] developer",
        location: "Remote, for a team in Amsterdam",
        highlights: [
          "Built the iOS and Android apps with [[React Native]] and [[Expo]], and the website with [[Next.js]], for a Dutch startup.",
          "Built features for a household management platform covering shopping, food-waste reduction and household finances.",
          "Integrated AI-powered image recognition that identifies what is in a fridge and keeps the food inventory up to date.",
          "Used [[TanStack]], [[Zustand]] and Material UI to keep interfaces maintainable, responsive and intuitive.",
        ],
      },
      dinamotor: {
        role: "Front-end team lead",
        location: "Remote, Tehran",
        highlights: [
          "Led front-end development part-time and remotely, in parallel with my full-time roles.",
          "Worked on an application that runs factory production lines end to end: machines, production, staff scheduling, warehouse and more.",
        ],
      },
      nadinsoft: {
        role: "Frontend to full-stack developer",
        location: "Tehran, Iran",
        steps: ["Full-stack developer", "Mid-level frontend developer ([[TypeScript]], [[React]], [[Vue]])", "Junior frontend developer ([[TypeScript]], [[React]], [[Vue]])"],
        highlights: [
          "Grew from frontend development into full-stack engineering, deepening my work in [[.NET]] and backend architecture.",
          "Contributed to Samin, an integrated management system for financial institutions that supports scalable organizational workflows.",
          "Designed and built a reusable [[C#]] framework that was adopted across company projects to improve consistency and maintainability.",
          "Implemented [[CQRS]], an Ocelot API gateway and AutoMapper to structure backend services and simplify communication between APIs.",
        ],
      },
      unitedtech: {
        role: "Frontend developer",
        location: "Tehran, Iran",
        highlights: [
          "Built responsive web interfaces for client-facing and enterprise applications with [[React]], [[Next.js]] and [[TypeScript]].",
          "Worked with cross-functional teams in agile workflows to deliver frontend features and improvements.",
          "Built my foundation in [[JavaScript]], component-based development and frontend state management.",
        ],
      },
    },
  },
  skills: {
    title: "Skills",
    intro: "The tools and practices I use, grouped by where they sit in a system.",
    groups: {
      backend: {
        label: "Backend",
        items: ["[[C#]]", "[[.NET]]", "[[ASP.NET Core]]", "[[ASP.NET Web API]]", "[[CQRS]]", "Ocelot", "AutoMapper", "Microservices", "Event-driven architecture"],
      },
      frontend: {
        label: "Frontend",
        items: ["[[JavaScript]]", "[[TypeScript]]", "[[React]]", "[[Next.js]]", "[[Vue]]", "Vite", "TanStack", "Zustand", "Material UI"],
      },
      mobile: { label: "Mobile", items: ["[[React Native]]", "Expo"] },
      data: {
        label: "Data & messaging",
        items: ["[[SQL Server]]", "Elasticsearch", "Redis", "Apache Kafka"],
      },
      devops: { label: "DevOps & tools", items: ["Docker", "Git"] },
      architecture: {
        label: "Architecture & engineering",
        items: ["Distributed systems", "Clean Architecture", "System design", "CAP theorem", "API design", "Debugging", "Problem solving", "Teamwork"],
      },
    },
  },
  projects: {
    title: "Selected projects",
    stackLabel: "Built with",
    items: {
      geoinsight: {
        kind: "Enterprise GIS platform",
        description:
          "A geospatial analytics platform for land assessment and environmental monitoring. It supports advanced search and analysis of satellite-derived environmental indicators such as NDVI, land surface temperature and vegetation health.",
      },
      pantrylab: {
        kind: "Household management app",
        description:
          "Website and iOS and Android apps for shopping, food inventory, food-waste reduction and household finances, with AI image recognition that reads the contents of a fridge.",
      },
      factory: {
        name: "Factory production management",
        kind: "Production-line software",
        description: "An application that runs a factory production line end to end: machines, production, staff scheduling and warehouse. I led its front-end development.",
      },
      samin: {
        name: "Samin",
        kind: "Integrated management system for financial institutions",
        description:
          "An integrated management system for financial institutions, built with the latest version of [[Vue]] at the time. I developed a dynamic form builder that sped up development considerably, and started the collaboration on the Persian-components package.",
      },
      "csharp-framework": {
        kind: "Reusable [[C#]] framework",
        description: "A shared foundation for company projects, designed and built to make them more consistent and easier to maintain.",
      },
    },
    links: { website: "Website", appStore: "App Store", googlePlay: "Google Play" },
    opensInNewTab: "opens in a new tab",
    rasterCaption: "Illustrative raster in an NDVI color ramp. Not project data.",
    rasterClasses: {
      bare: "Bare",
      sparse: "Sparse",
      moderate: "Moderate",
      healthy: "Healthy",
      dense: "Dense",
    },
    confidential: "Across these roles I have also contributed to proprietary client and enterprise applications that I can't show publicly.",
  },
  caseStudies: {
    label: "Case study",
    readMore: "Read the case study",
    backToProjects: "All projects",
    other: "Other case study",
    facts: { company: "Company", period: "Period", role: "My role", employment: "Employment", stack: "Stack" },
    items: {
      geoinsight: {
        title: "GeoInsight",
        kind: "Case study: enterprise GIS platform",
        summary:
          "How I build backend microservices for GeoInsight, an enterprise GIS platform for land assessment and environmental monitoring, with ASP.NET Core, Kafka, Elasticsearch, Redis and SQL Server.",
        intro:
          "GeoInsight is an enterprise GIS and geospatial analytics platform for land assessment and environmental monitoring. I have worked on it as a full-stack engineer at [[Sisootech]] since August 2025.",
        sections: [
          {
            heading: "The problem",
            paragraphs: [
              "Land assessment and environmental monitoring depend on indicators derived from satellite data, such as NDVI, land surface temperature, vegetation health and climate indicators. GeoInsight makes these indicators searchable and available for analysis.",
            ],
          },
          {
            heading: "My role",
            bullets: [
              "Develop and maintain the platform as a full-stack engineer.",
              "Design and build backend microservices with [[ASP.NET Core]], [[Elasticsearch]], [[Redis]], [[Kafka]] and [[SQL Server]].",
              "Implement advanced search and the satellite-derived environmental indicators.",
              "Apply event-driven architecture and distributed-systems principles for availability, reliability and data consistency.",
            ],
          },
          {
            heading: "How the backend fits together",
            paragraphs: [
              "The backend is a set of microservices built with [[ASP.NET Core]]. Services exchange events through [[Kafka]], [[Elasticsearch]] powers advanced search, [[Redis]] handles caching and [[SQL Server]] stores the data.",
            ],
          },
        ],
        diagram: {
          title: "Simplified architecture",
          caption: "The technologies I work with on GeoInsight and how they relate. A simplified view, not a complete system diagram.",
          source: "Satellite-derived indicators",
          sourceDetail: "NDVI, land surface temperature, vegetation health, climate",
          services: "[[ASP.NET Core]] microservices",
          events: "[[Kafka]]: events between services",
          search: "[[Elasticsearch]]: advanced search",
          cache: "[[Redis]]: caching",
          storage: "[[SQL Server]]: storage",
          users: "GIS platform for land assessment and environmental monitoring",
        },
        confidentiality: "Client data, screenshots and internal details are confidential, so this page describes the work without showing them.",
      },
      factory: {
        title: "Factory production management",
        kind: "Case study: production-line software at [[Dinamotor]]",
        summary:
          "How I led front-end development, part-time and remotely, for an application that runs factory production lines end to end: machines, production, staff scheduling and warehouse.",
        intro:
          "At [[Dinamotor]] I worked on an application that manages factory production lines end to end. From October 2023 to November 2026 I led its front-end development as a part-time, remote team lead, in parallel with my full-time roles.",
        sections: [
          {
            heading: "What the application covers",
            paragraphs: [
              "One place to run a production line: the machines, what is being produced, how staff are scheduled and what is in the warehouse, among other areas.",
            ],
          },
          {
            heading: "My role",
            bullets: [
              "Led front-end development as the front-end team lead.",
              "Worked across the application's areas: machines, production, staff scheduling and warehouse.",
              "Worked part-time and remotely, in parallel with full-time roles at Nadin Soft and Sisootech.",
            ],
          },
        ],
        diagram: {
          title: "Areas of the application",
          caption: "The areas named in my CV. An illustration, not the product's interface.",
          hub: "Factory operations application",
          modules: {
            machines: "Machines",
            production: "Production",
            scheduling: "Staff scheduling",
            warehouse: "Warehouse",
            more: "and more",
          },
        },
        confidentiality: "The product and its data are confidential, so this page describes the work without showing screens.",
      },
    },
  },
  education: {
    title: "Education",
    degree: "Bachelor's in Computer Engineering",
    institution: "Shamsipour Technical and Vocational College",
    location: "Tehran, Iran",
  },
  contact: {
    title: "Contact",
    lead: "For roles, projects or questions, email or call me directly. I'm also on LinkedIn, GitHub and Telegram.",
    emailLabel: "Email",
    phoneLabel: "Phone",
    copy: "Copy email",
    copied: "Email copied",
    copyFailed: "Couldn't copy. Select the address and copy it instead.",
    compose: "Write an email",
    elsewhere: "Elsewhere",
    cv: "CV (PDF)",
    links: { linkedin: "LinkedIn", github: "GitHub", telegram: "Telegram" },
  },
  footer: {
    backToTop: "Back to top",
    note: "Erfan Alikhani, full-stack developer in Tehran",
  },
  notFound: {
    title: "This page isn't on the map",
    body: "The address may be mistyped, or the page has moved.",
    action: "Go to the homepage",
  },
} satisfies SiteCopy;
