# Alternup - Manage your alternship

![Image Description](docs/readme_cover.jpg)  

Welcome to **Alternup**, a NuxtJS solution allowing tutors to monitor and manage their work-study students (and interns). The project now relies on a Supabase database, Tailwind CSS as a styling framework and TypeScript. The application will allow you to see your work-study students/trainees, see your tasks, see your average, your skills and create personalized quizzes.



# Table of Contents

1. Installation

2. To be defined

3. To be defined

4. License

# Project overview
[![](https://img.shields.io/badge/Nuxt-00DC82?style=for-the-badge&logo=nuxtdotjs&logoColor=white)](https://nuxt.com)
[![](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/en)
[![](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/)
[![](https://img.shields.io/badge/figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com)

# Installation 

## Docker

Each app contains its own `Dockerfile`. Build and run them separately if you want
to containerize the project:

```bash
docker build -t alternup-frontend ./apps/frontend
docker run -p 3000:3000 alternup-frontend
```

```bash
docker build -t alternup-backend ./apps/backend
docker run -p 4000:4000 alternup-backend
```

# Manual - with commands

First you need to install nodeJS : [Node Oficial Website](https://nodejs.org/en).
Then go in the `apps/frontend` folder, and execute these commands :
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
To start the backend just run the same command inside `apps/backend`.

To use it in production you need to follow these steps :
```bash
npm run build #create the build application
npm run start #run the prod application
```
# License

You may use, modify and contribute to this project for personal, non-commercial purposes.  
This project is under license.  
For more details, read the [LICENSE](LICENSE) file.

---
2024 - Roche Sébastien