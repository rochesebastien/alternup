# Alternup - Manage your alternship

![Image Description](docs/readme_cover.jpg)  

Welcome to **Alternup**, a NextJS solution allowing tutors to monitor and manage their work-study students (and interns). The project uses a PostgresSQL database, tailwindCSS as a styling framework and Typescript. The application will allow you to see your work-study students/trainees, see your tasks, see your average, your skills and create personalized quizzes.



# Table of Contents

1. Installation

2. To be defined

3. To be defined

4. License

# Project overview
[![](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)](https://www.figma.com)
[![](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/en)
[![](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/)
[![](https://img.shields.io/badge/figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com)

# Installation 

## Automate - using Docker

If u want to launch all the part of the solution just run the following command : 

```bash
docker-compose up
```
This command will create 2 containers: 
- postgresql database 
- nextjs_app based on the database (in prod version)

# Manual - with commands

First you need to install nodeJS : [Node Oficial Website](https://nodejs.org/en).
Then go in the nextjs_app folder, and execute this commands : 
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

And to finish you need to start the BDD Dockerfile.
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